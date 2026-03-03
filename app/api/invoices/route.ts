import { requireAdmin, requireClient } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAuditLog } from "@/lib/audit-log"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get("client_id")
  const me = searchParams.get("me")
  const supabase = createAdminClient()

  let query = supabase
    .from("invoices")
    .select("*, clients(full_name, email), issued_by:admin_users!invoices_issued_by_admin_id_fkey(full_name, email, role)")
    .order("created_at", { ascending: false })

  if (me === "true") {
    const client = await requireClient()
    if (!client.ok) return client.response
    query = query.eq("client_id", client.clientId)
  } else {
    const admin = await requireAdmin("caja")
    if (!admin.ok) return admin.response
  }

  if (clientId && me !== "true") {
    query = query.eq("client_id", clientId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoices: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const clientId = String(body.client_id || "")
  const invoiceNumber = String(body.invoice_number || "").trim()
  const amount = Number(body.amount || 0)

  if (!clientId || !invoiceNumber || Number.isNaN(amount) || amount < 0) {
    return NextResponse.json(
      { error: "Debes enviar client_id, invoice_number y amount validos." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const pointsEarned = amount >= 1000 ? Math.floor(amount / 1000) : 0

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id: clientId,
      invoice_number: invoiceNumber,
      amount,
      points_earned: pointsEarned,
      issued_by_admin_id: admin.admin.id,
    })
    .select("*, clients(full_name, email), issued_by:admin_users!invoices_issued_by_admin_id_fkey(full_name, email, role)")
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: error?.message || "No se pudo registrar la factura." }, { status: 500 })
  }

  let previousPoints = 0
  if (pointsEarned > 0) {
    const { data: client } = await supabase
      .from("clients")
      .select("points")
      .eq("id", clientId)
      .single()

    previousPoints = client?.points || 0

    await supabase
      .from("clients")
      .update({ points: previousPoints + pointsEarned })
      .eq("id", clientId)
  }

  await createAuditLog({
    entityType: "invoice",
    entityId: invoice.id,
    action: "create",
    afterData: {
      ...invoice,
      points_added_to_client: pointsEarned,
      previous_client_points: previousPoints,
    },
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ invoice, points_earned: pointsEarned }, { status: 201 })
}

