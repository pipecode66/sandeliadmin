import {
  CLIENT_ACCESS_TOKEN_TTL_SECONDS,
  createClientAccessToken,
} from "@/lib/client-access-token"
import { CLIENT_PUBLIC_SELECT } from "@/lib/client-fields"
import { corsJson, corsNoContent } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "POST,OPTIONS"

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
  if (!digits) return []

  const candidates = new Set<string>([digits])
  if (digits.startsWith("57") && digits.length > 10) {
    candidates.add(digits.slice(2))
  }
  if (digits.length === 10) {
    candidates.add(`57${digits}`)
  }

  return Array.from(candidates)
}

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function POST(request: Request) {
  let body: { identifier?: unknown; password?: unknown }

  try {
    body = (await request.json()) as { identifier?: unknown; password?: unknown }
  } catch {
    return corsJson(request, { error: "JSON invalido." }, { status: 400 }, CORS_METHODS)
  }

  if (!body.identifier || typeof body.identifier !== "string") {
    return corsJson(
      request,
      { error: "Debes enviar un correo o telefono valido." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const { isEmail, value } = normalizeIdentifier(body.identifier)
  if (!value) {
    return corsJson(
      request,
      { error: "Debes enviar un correo o telefono valido." },
      { status: 400 },
      CORS_METHODS,
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
      return corsJson(
        request,
        { error: "No se encontro una cuenta con esas credenciales." },
        { status: 404 },
        CORS_METHODS,
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
      return corsJson(
        request,
        { error: "No se encontro una cuenta con esas credenciales." },
        { status: 404 },
        CORS_METHODS,
      )
    }

    client = [...result.data].sort((left, right) => {
      const leftIndex = phoneCandidates.indexOf(String(left.phone || ""))
      const rightIndex = phoneCandidates.indexOf(String(right.phone || ""))
      return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
    })[0]
  }

  if (!client.password_set || !client.password_plain) {
    return corsJson(
      request,
      {
        success: true,
        requiresPasswordSetup: true,
        clientId: client.id,
        clientName: client.full_name,
      },
      { status: 200 },
      CORS_METHODS,
    )
  }

  if (!body.password || typeof body.password !== "string") {
    return corsJson(
      request,
      { error: "Ingresa tu contrasena para continuar." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  if (body.password !== client.password_plain) {
    return corsJson(
      request,
      { error: "Contrasena incorrecta." },
      { status: 401 },
      CORS_METHODS,
    )
  }

  const { data: clientData } = await supabase
    .from("clients")
    .select(CLIENT_PUBLIC_SELECT)
    .eq("id", client.id)
    .single()

  const accessToken = createClientAccessToken(client.id)

  return corsJson(
    request,
    {
      success: true,
      tokenType: "Bearer",
      accessToken,
      expiresIn: CLIENT_ACCESS_TOKEN_TTL_SECONDS,
      client: clientData,
    },
    { status: 200 },
    CORS_METHODS,
  )
}
