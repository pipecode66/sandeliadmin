import {
  CLIENT_ACCESS_TOKEN_TTL_SECONDS,
  createClientAccessToken,
} from "@/lib/client-access-token"
import {
  CLIENT_PASSWORD_RULE,
  CLIENT_PUBLIC_SELECT,
  isValidSimplePassword,
} from "@/lib/client-fields"
import { corsJson, corsNoContent } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "POST,OPTIONS"

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function POST(request: Request) {
  let body: { clientId?: unknown; password?: unknown }

  try {
    body = (await request.json()) as { clientId?: unknown; password?: unknown }
  } catch {
    return corsJson(request, { error: "JSON inválido." }, { status: 400 }, CORS_METHODS)
  }

  if (!body.clientId || typeof body.clientId !== "string") {
    return corsJson(
      request,
      { error: "Cliente inválido." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  if (
    !body.password ||
    typeof body.password !== "string" ||
    !isValidSimplePassword(body.password)
  ) {
    return corsJson(
      request,
      { error: CLIENT_PASSWORD_RULE },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const supabase = createAdminClient()
  const { data: existingClient, error: existingError } = await supabase
    .from("clients")
    .select("id, password_set")
    .eq("id", body.clientId)
    .single()

  if (existingError || !existingClient) {
    return corsJson(
      request,
      { error: "Cliente no encontrado." },
      { status: 404 },
      CORS_METHODS,
    )
  }

  if (existingClient.password_set) {
    return corsJson(
      request,
      { error: "Esta cuenta ya tiene contraseña configurada." },
      { status: 409 },
      CORS_METHODS,
    )
  }

  const { data: updatedClient, error: updateError } = await supabase
    .from("clients")
    .update({
      password_plain: body.password,
      password_set: true,
      password_updated_at: new Date().toISOString(),
    })
    .eq("id", body.clientId)
    .select(CLIENT_PUBLIC_SELECT)
    .single()

  if (updateError || !updatedClient) {
    return corsJson(
      request,
      { error: updateError?.message || "No se pudo guardar la contraseña." },
      { status: 500 },
      CORS_METHODS,
    )
  }

  const accessToken = createClientAccessToken(body.clientId)

  return corsJson(
    request,
    {
      success: true,
      tokenType: "Bearer",
      accessToken,
      expiresIn: CLIENT_ACCESS_TOKEN_TTL_SECONDS,
      client: updatedClient,
    },
    { status: 200 },
    CORS_METHODS,
  )
}
