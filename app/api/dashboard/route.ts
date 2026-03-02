import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const today = new Date().toISOString().split("T")[0]

  // Total clients
  const { count: totalClients } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })

  // Total products
  const { count: totalProducts } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })

  // Redemptions validated today
  const { data: todayRedemptions } = await supabase
    .from("redemptions")
    .select("points_spent")
    .eq("status", "validated")
    .gte("validated_at", `${today}T00:00:00`)

  const pointsRedeemedToday = todayRedemptions?.reduce(
    (sum, r) => sum + r.points_spent,
    0
  ) || 0

  // Invoices today
  const { count: invoicesToday } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${today}T00:00:00`)

  // Pending redemptions
  const { count: pendingRedemptions } = await supabase
    .from("redemptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  // Last 7 days redemption data
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const { data: weekRedemptions } = await supabase
    .from("redemptions")
    .select("points_spent, validated_at")
    .eq("status", "validated")
    .gte("validated_at", weekAgo.toISOString())

  // Group by day
  const dailyData: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dailyData[d.toISOString().split("T")[0]] = 0
  }
  weekRedemptions?.forEach((r) => {
    if (r.validated_at) {
      const day = r.validated_at.split("T")[0]
      if (dailyData[day] !== undefined) {
        dailyData[day] += r.points_spent
      }
    }
  })

  // Recent activity
  const { data: recentClients } = await supabase
    .from("clients")
    .select("id, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, points_earned, created_at, clients(full_name)")
    .order("created_at", { ascending: false })
    .limit(5)

  return NextResponse.json({
    stats: {
      totalClients: totalClients || 0,
      totalProducts: totalProducts || 0,
      pointsRedeemedToday,
      invoicesToday: invoicesToday || 0,
      pendingRedemptions: pendingRedemptions || 0,
    },
    chartData: Object.entries(dailyData).map(([date, points]) => ({
      date,
      points,
    })),
    recentClients: recentClients || [],
    recentInvoices: recentInvoices || [],
  })
}
