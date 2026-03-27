import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { CLIENT_INVOICE_SELECT } from "@/lib/invoice-utils"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !client) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select(CLIENT_INVOICE_SELECT)
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  const { data: redemptions } = await supabase
    .from("redemptions")
    .select(
      "*, products(name, image_url), validated_by:admin_users!redemptions_validated_by_admin_id_fkey(full_name, email, role)",
    )
    .eq("client_id", id)
    .order("created_at", { ascending: false })

  return NextResponse.json({
    client,
    invoices: invoices || [],
    redemptions: redemptions || [],
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const { data: current, error: currentError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.full_name === "string") updates.full_name = body.full_name.trim()
  if (typeof body.email === "string") updates.email = body.email.trim().toLowerCase()
  if (typeof body.phone === "string") updates.phone = body.phone.replace(/[^\d]/g, "")
  if (typeof body.address === "string") updates.address = body.address.trim()
  if (body.gender === "Femenino" || body.gender === "Masculino") updates.gender = body.gender
  if (typeof body.daily_limit_override === "boolean") {
    updates.daily_limit_override = body.daily_limit_override
  }

  if (body.password_plain !== undefined) {
    if (typeof body.password_plain === "string" && body.password_plain.trim()) {
      updates.password_plain = body.password_plain.trim()
      updates.password_set = true
      updates.password_updated_at = new Date().toISOString()
    } else {
      updates.password_plain = null
      updates.password_set = false
      updates.password_updated_at = null
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay campos validos para actualizar." },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "No se pudo actualizar el cliente." },
      { status: 500 },
    )
  }

  await createAuditLog({
    entityType: "client",
    entityId: id,
    action: "update_profile",
    beforeData: current,
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ client: data })
}
