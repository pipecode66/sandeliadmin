import { requireClient } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const clientSession = await requireClient()
  if (!clientSession.ok) return clientSession.response
  const clientId = clientSession.clientId

  const supabase = createAdminClient()
  const { data: clientData, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (error || !clientData) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ client: clientData })
}

export async function PATCH(request: Request) {
  const clientSession = await requireClient()
  if (!clientSession.ok) return clientSession.response
  const clientId = clientSession.clientId

  const body = await request.json()
  const allowedUpdates: Record<string, unknown> = {}
  if (typeof body.full_name === "string") allowedUpdates.full_name = body.full_name.trim()
  if (typeof body.avatar === "string" || body.avatar === null) allowedUpdates.avatar = body.avatar
  if (body.avatar_type === "custom" || body.avatar_type === "preset") {
    allowedUpdates.avatar_type = body.avatar_type
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("clients")
    .update(allowedUpdates)
    .eq("id", clientId)
    .select("*")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "No se pudo actualizar el perfil." },
      { status: 500 },
    )
  }

  return NextResponse.json({ client: data })
}
