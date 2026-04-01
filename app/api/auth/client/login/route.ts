import { CLIENT_PUBLIC_SELECT } from "@/lib/client-fields"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

function normalizeIdentifier(rawIdentifier: string) {
  const trimmed = rawIdentifier.trim()
  const isEmail = trimmed.includes("@")

  return {
    isEmail,
    value: isEmail ? trimmed.toLowerCase() : trimmed.replace(/[^\d]/g, ""),
  }
}

function buildPhoneCandidates(rawPhone: string) {
  const digits = rawPhone.replace(/[^\d]/g, "")
  if (!/^\d{10}$/.test(digits)) return []

  const candidates = new Set<string>([digits, `57${digits}`])

  return Array.from(candidates)
}

export async function POST(request: Request) {
  const { identifier, password } = await request.json()
  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json(
      { error: "Debes enviar un correo o teléfono válido." },
      { status: 400 },
    )
  }

  const { isEmail, value } = normalizeIdentifier(identifier)
  if (!value) {
    return NextResponse.json(
      { error: "Debes enviar un correo o teléfono válido." },
      { status: 400 },
    )
  }

  if (!isEmail && !/^\d{10}$/.test(value)) {
    return NextResponse.json(
      { error: "Ingresa un número de teléfono de 10 dígitos." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  let client:
    | {
        id: string
        full_name: string
        email: string | null
        phone: string | null
        password_plain: string | null
        password_set: boolean | null
      }
    | null = null

  if (isEmail) {
    const result = await supabase
      .from("clients")
      .select("id, full_name, email, phone, password_plain, password_set")
      .ilike("email", value)
      .limit(1)
      .maybeSingle()

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: "No se encontró una cuenta con esas credenciales." },
        { status: 404 },
      )
    }

    client = result.data
  } else {
    const phoneCandidates = buildPhoneCandidates(value)
    const result = await supabase
      .from("clients")
      .select("id, full_name, email, phone, password_plain, password_set")
      .in("phone", phoneCandidates)
      .limit(10)

    if (result.error || !result.data || result.data.length === 0) {
      return NextResponse.json(
        { error: "No se encontró una cuenta con esas credenciales." },
        { status: 404 },
      )
    }

    client = [...result.data].sort((left, right) => {
      const leftIndex = phoneCandidates.indexOf(String(left.phone || ""))
      const rightIndex = phoneCandidates.indexOf(String(right.phone || ""))
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
    })[0]
  }

  if (!client.password_set || !client.password_plain) {
    return NextResponse.json({
      success: true,
      requiresPasswordSetup: true,
      clientId: client.id,
      clientName: client.full_name,
    })
  }

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Ingresa tu contraseña para continuar." },
      { status: 400 },
    )
  }

  if (password !== client.password_plain) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set("sandeli_client_id", client.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  const { data: clientData } = await supabase
    .from("clients")
    .select(CLIENT_PUBLIC_SELECT)
    .eq("id", client.id)
    .single()

  return NextResponse.json({ success: true, client: clientData })
}
