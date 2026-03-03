import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { code } = await request.json()
  const supabase = createAdminClient()

  // Find the redemption by code
  const { data: redemption, error } = await supabase
    .from("redemptions")
    .select("*, products(name, points_cost, image_url), clients(full_name, points, redeemed_today, last_redeem_date)")
    .eq("code", code.toUpperCase())
    .eq("status", "pending")
    .single()

  if (error || !redemption) {
    return NextResponse.json(
      { error: "Código no encontrado o ya fue validado." },
      { status: 404 }
    )
  }

  const client = redemption.clients as { full_name: string; points: number; redeemed_today: number; last_redeem_date: string }
  const today = new Date().toISOString().split("T")[0]
  const currentRedeemedToday =
    client.last_redeem_date === today ? client.redeemed_today : 0

  // Check daily limit
  if (currentRedeemedToday + redemption.points_spent > 60) {
    return NextResponse.json(
      { error: "El cliente ya alcanzó el límite diario de 60 puntos canjeados." },
      { status: 400 }
    )
  }

  // Check if client has enough points still
  if (client.points < redemption.points_spent) {
    return NextResponse.json(
      { error: "El cliente no tiene suficientes puntos." },
      { status: 400 }
    )
  }

  // Validate the redemption
  await supabase
    .from("redemptions")
    .update({
      status: "validated",
      validated_at: new Date().toISOString(),
    })
    .eq("id", redemption.id)

  // Deduct points and update daily count
  await supabase
    .from("clients")
    .update({
      points: client.points - redemption.points_spent,
      redeemed_today: currentRedeemedToday + redemption.points_spent,
      last_redeem_date: today,
    })
    .eq("id", redemption.client_id)

  return NextResponse.json({
    success: true,
    redemption: {
      ...redemption,
      status: "validated",
    },
    pointsDeducted: redemption.points_spent,
    clientName: client.full_name,
  })
}
