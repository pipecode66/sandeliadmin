import { CLIENT_PUBLIC_SELECT } from "@/lib/client-fields"
import { corsJson, corsNoContent, requirePublicClient } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "GET,PATCH,OPTIONS"

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function GET(request: Request) {
  const auth = requirePublicClient(request)
  if (!auth.ok) return auth.response

  const supabase = createAdminClient()
  const { data: clientData, error } = await supabase
    .from("clients")
    .select(CLIENT_PUBLIC_SELECT)
    .eq("id", auth.clientId)
    .single()

  if (error || !clientData) {
    return corsJson(
      request,
      { error: "Cliente no encontrado." },
      { status: 404 },
      CORS_METHODS,
    )
  }

  return corsJson(request, { client: clientData }, { status: 200 }, CORS_METHODS)
}

export async function PATCH(request: Request) {
  const auth = requirePublicClient(request)
  if (!auth.ok) return auth.response

  let body: {
    full_name?: unknown
    avatar?: unknown
    avatar_type?: unknown
  }

  try {
    body = (await request.json()) as {
      full_name?: unknown
      avatar?: unknown
      avatar_type?: unknown
    }
  } catch {
    return corsJson(request, { error: "JSON inválido." }, { status: 400 }, CORS_METHODS)
  }

  const allowedUpdates: Record<string, unknown> = {}
  if (typeof body.full_name === "string") {
    const trimmedName = body.full_name.trim()
    if (!trimmedName) {
      return corsJson(
        request,
        { error: "El nombre no puede estar vacío." },
        { status: 400 },
        CORS_METHODS,
      )
    }
    allowedUpdates.full_name = trimmedName
  }
  if (typeof body.avatar === "string" || body.avatar === null) {
    allowedUpdates.avatar = body.avatar
  }
  if (body.avatar_type === "custom" || body.avatar_type === "preset") {
    allowedUpdates.avatar_type = body.avatar_type
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return corsJson(
      request,
      { error: "No hay campos válidos para actualizar." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("clients")
    .update(allowedUpdates)
    .eq("id", auth.clientId)
    .select(CLIENT_PUBLIC_SELECT)
    .single()

  if (error || !data) {
    return corsJson(
      request,
      { error: error?.message || "No se pudo actualizar el perfil." },
      { status: 500 },
      CORS_METHODS,
    )
  }

  return corsJson(request, { client: data }, { status: 200 }, CORS_METHODS)
}
