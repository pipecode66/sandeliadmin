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

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function POST(request: Request) {
  let body: { identifier?: unknown; password?: unknown }

  try {
    body = (await request.json()) as { identifier?: unknown; password?: unknown }
  } catch {
    return corsJson(request, { error: "JSON inválido." }, { status: 400 }, CORS_METHODS)
  }

  if (!body.identifier || typeof body.identifier !== "string") {
    return corsJson(
      request,
      { error: "Debes enviar un correo o teléfono válido." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const { isEmail, value } = normalizeIdentifier(body.identifier)
  if (!value) {
    return corsJson(
      request,
      { error: "Debes enviar un correo o teléfono válido." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const supabase = createAdminClient()

  let query = supabase
    .from("clients")
    .select("id, full_name, email, phone, password_plain, password_set")

  query = isEmail ? query.ilike("email", value) : query.eq("phone", value)

  const { data: client, error } = await query.limit(1).maybeSingle()

  if (error || !client) {
    return corsJson(
      request,
      { error: "No se encontró una cuenta con esas credenciales." },
      { status: 404 },
      CORS_METHODS,
    )
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
      { error: "Ingresa tu contraseña para continuar." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  if (body.password !== client.password_plain) {
    return corsJson(
      request,
      { error: "Contraseña incorrecta." },
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
