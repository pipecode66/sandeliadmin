import { CLIENT_PUBLIC_SELECT } from "@/lib/client-fields"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { identifier, password } = await request.json()
  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json(
      { error: "Debes enviar un correo o telefono valido." },
      { status: 400 },
    )
  }

  const normalizedIdentifier = identifier.trim()
  const supabase = createAdminClient()

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, full_name, email, phone, password_plain, password_set")
    .or(`email.eq.${normalizedIdentifier},phone.eq.${normalizedIdentifier}`)
    .single()

  if (error || !client) {
    return NextResponse.json(
      { error: "No se encontro una cuenta con esas credenciales." },
      { status: 404 },
    )
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
