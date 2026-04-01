import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

type DashboardRange = "day" | "7d" | "15d" | "30d" | "year"

function getRangeBounds(range: DashboardRange, dateInput?: string | null) {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  if (range === "day") {
    const selected = dateInput ? new Date(`${dateInput}T00:00:00`) : new Date()
    selected.setHours(0, 0, 0, 0)
    const selectedEnd = new Date(selected)
    selectedEnd.setHours(23, 59, 59, 999)
    return { start: selected, end: selectedEnd }
  }

  if (range === "7d") {
    start.setDate(start.getDate() - 6)
  } else if (range === "15d") {
    start.setDate(start.getDate() - 14)
  } else if (range === "30d") {
    start.setDate(start.getDate() - 29)
  } else {
    start.setMonth(0, 1)
  }

  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function getDateKey(value: string) {
  return new Date(value).toISOString().split("T")[0]
}

function getInvoiceEffectiveDate(invoice: { imported_at?: string | null; created_at?: string | null }) {
  return String(invoice.imported_at || invoice.created_at || new Date().toISOString())
}

export async function GET(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const rawRange = (searchParams.get("range") || "7d") as DashboardRange
  const range: DashboardRange = ["day", "7d", "15d", "30d", "year"].includes(rawRange)
    ? rawRange
    : "7d"
  const dateInput = searchParams.get("date")
  const clientId = searchParams.get("client_id")

  const { start, end } = getRangeBounds(range, dateInput)
  const startIso = start.toISOString()
  const endIso = end.toISOString()

  const supabase = createAdminClient()

  const [clientsCountResult, productsCountResult, clientsOptionsResult] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("clients").select("id, full_name, email").order("full_name").limit(1000),
  ])

  let invoicesQuery = supabase
    .from("invoices")
    .select(
      "id, client_id, invoice_number, amount, points_earned, created_at, imported_at, source, source_invoice_id, match_status, points_applied_at, clients(full_name), issued_by:admin_users!invoices_issued_by_admin_id_fkey(full_name, email)",
    )
    .gte("created_at", startIso)
    .lte("created_at", endIso)

  let redemptionsQuery = supabase
    .from("redemptions")
    .select("id, client_id, code, points_spent, status, created_at, validated_at, products(name), validated_by:admin_users!redemptions_validated_by_admin_id_fkey(full_name, email)")
    .eq("status", "validated")
    .gte("validated_at", startIso)
    .lte("validated_at", endIso)

  let pendingQuery = supabase
    .from("redemptions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")

  if (clientId) {
    invoicesQuery = invoicesQuery.eq("client_id", clientId)
    redemptionsQuery = redemptionsQuery.eq("client_id", clientId)
    pendingQuery = pendingQuery.eq("client_id", clientId)
  }

  const [invoicesResult, redemptionsResult, pendingResult] = await Promise.all([
    invoicesQuery.order("created_at", { ascending: false }),
    redemptionsQuery.order("validated_at", { ascending: false }),
    pendingQuery,
  ])

  if (invoicesResult.error || redemptionsResult.error) {
    return NextResponse.json(
      {
        error:
          invoicesResult.error?.message || redemptionsResult.error?.message || "Error de consulta.",
      },
      { status: 500 },
    )
  }

  const invoices = invoicesResult.data || []
  const redemptions = redemptionsResult.data || []
  const pendingRedemptions = pendingResult.count || 0

  const pointsRedeemed = redemptions.reduce((sum, row) => sum + Number(row.points_spent || 0), 0)
  const pointsEarned = invoices.reduce(
    (sum, row) => sum + (row.points_applied_at ? Number(row.points_earned || 0) : 0),
    0,
  )
  const amountInvoiced = invoices.reduce((sum, row) => sum + Number(row.amount || 0), 0)

  const chartMap: Record<string, { pointsRedeemed: number; pointsEarned: number; invoices: number }> = {}
  const cursor = new Date(start)
  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0]
    chartMap[key] = { pointsRedeemed: 0, pointsEarned: 0, invoices: 0 }
    cursor.setDate(cursor.getDate() + 1)
  }

  invoices.forEach((invoice) => {
    const key = getDateKey(getInvoiceEffectiveDate(invoice))
    if (!chartMap[key]) chartMap[key] = { pointsRedeemed: 0, pointsEarned: 0, invoices: 0 }
    chartMap[key].invoices += 1
    if (invoice.points_applied_at) {
      chartMap[key].pointsEarned += Number(invoice.points_earned || 0)
    }
  })

  redemptions.forEach((redemption) => {
    if (!redemption.validated_at) return
    const key = getDateKey(String(redemption.validated_at))
    if (!chartMap[key]) chartMap[key] = { pointsRedeemed: 0, pointsEarned: 0, invoices: 0 }
    chartMap[key].pointsRedeemed += Number(redemption.points_spent || 0)
  })

  let clientAnalytics = null as
    | null
    | {
        clientId: string
        clientName: string
        totalInvoices: number
        totalAmount: number
        totalPointsEarned: number
        totalRedemptions: number
        totalPointsRedeemed: number
        invoices: unknown[]
        redemptions: unknown[]
      }

  if (clientId) {
    const selectedClient = (clientsOptionsResult.data || []).find((item) => item.id === clientId)
    clientAnalytics = {
      clientId,
      clientName: selectedClient?.full_name || "Cliente",
      totalInvoices: invoices.length,
      totalAmount: amountInvoiced,
      totalPointsEarned: pointsEarned,
      totalRedemptions: redemptions.length,
      totalPointsRedeemed: pointsRedeemed,
      invoices,
      redemptions,
    }
  }

  return NextResponse.json({
    range,
    date: dateInput,
    start: startIso,
    end: endIso,
    stats: {
      totalClients: clientsCountResult.count || 0,
      totalProducts: productsCountResult.count || 0,
      invoices: invoices.length,
      pointsEarned,
      amountInvoiced,
      pointsRedeemed,
      pendingRedemptions,
    },
    chartData: Object.entries(chartMap).map(([date, values]) => ({
      date,
      ...values,
    })),
    clients: clientsOptionsResult.data || [],
    clientAnalytics,
    recentInvoices: invoices.slice(0, 10),
    recentRedemptions: redemptions.slice(0, 10),
  })
}
