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
      { error: "Debes enviar el código de redención." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: redemption, error } = await supabase
    .from("redemptions")
    .select(
      "*, products(name, points_cost, image_url), clients(full_name, points, redeemed_today, last_redeem_date, daily_limit_override)",
    )
    .eq("code", normalizedCode)
    .eq("status", "pending")
    .single()

  if (error || !redemption) {
    return NextResponse.json(
      { error: "Código no encontrado o ya fue validado." },
      { status: 404 },
    )
  }

  const client = redemption.clients as {
    full_name: string
    points: number
    redeemed_today: number
    last_redeem_date: string
    daily_limit_override?: boolean
  }

  const today = new Date().toISOString().split("T")[0]
  const currentRedeemedToday = client.last_redeem_date === today ? client.redeemed_today : 0
  const override = Boolean(client.daily_limit_override)

  if (!override && currentRedeemedToday + redemption.points_spent > 60) {
    return NextResponse.json(
      { error: "El cliente ya alcanzó el límite diario de 60 puntos canjeados." },
      { status: 400 },
    )
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
      { error: updateRedemptionError?.message || "No se pudo validar la redención." },
      { status: 500 },
    )
  }

  const { data: updatedClient, error: updateClientError } = await supabase
    .from("clients")
    .update({
      points: client.points - redemption.points_spent,
      redeemed_today: currentRedeemedToday + redemption.points_spent,
      last_redeem_date: today,
    })
    .eq("id", redemption.client_id)
    .select("id, points, redeemed_today, last_redeem_date")
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
