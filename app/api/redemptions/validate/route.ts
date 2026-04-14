import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { code, comment } = await request.json()
  const normalizedCode = String(code || "").trim().toUpperCase()
  if (!normalizedCode) {
    return NextResponse.json(
      { error: "Debes enviar el codigo de redencion." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: redemption, error } = await supabase
    .from("redemptions")
    .select(
      "*, products(name, points_cost, image_url), clients(full_name, points)",
    )
    .eq("code", normalizedCode)
    .eq("status", "pending")
    .single()

  if (error || !redemption) {
    return NextResponse.json(
      { error: "Codigo no encontrado o ya fue validado." },
      { status: 404 },
    )
  }

  const client = redemption.clients as {
    full_name: string
    points: number
  }

  if (client.points < redemption.points_spent) {
    return NextResponse.json(
      { error: "El cliente no tiene suficientes puntos." },
      { status: 400 },
    )
  }

  const { data: updatedRedemption, error: updateRedemptionError } = await supabase
    .from("redemptions")
    .update({
      status: "validated",
      validated_at: new Date().toISOString(),
      validated_by_admin_id: admin.admin.id,
    })
    .eq("id", redemption.id)
    .select(
      "*, products(name, image_url), validated_by:admin_users!redemptions_validated_by_admin_id_fkey(full_name, email, role)",
    )
    .single()

  if (updateRedemptionError || !updatedRedemption) {
    return NextResponse.json(
      { error: updateRedemptionError?.message || "No se pudo validar la redencion." },
      { status: 500 },
    )
  }

  const { data: updatedClient, error: updateClientError } = await supabase
    .from("clients")
    .update({
      points: client.points - redemption.points_spent,
    })
    .eq("id", redemption.client_id)
    .select("id, points")
    .single()

  if (updateClientError) {
    return NextResponse.json({ error: updateClientError.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "redemption",
    entityId: redemption.id,
    action: "validate",
    beforeData: redemption,
    afterData: {
      redemption: updatedRedemption,
      client: updatedClient,
    },
    comment: typeof comment === "string" ? comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({
    success: true,
    redemption: updatedRedemption,
    pointsDeducted: redemption.points_spent,
    clientName: client.full_name,
  })
}
