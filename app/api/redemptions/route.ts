import { requireAdmin, requireClient } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// POST: Client creates a redemption from mobile app
export async function POST(request: Request) {
  const clientSession = await requireClient()
  if (!clientSession.ok) return clientSession.response
  const clientId = clientSession.clientId

  const { product_id } = await request.json()
  const supabase = createAdminClient()

  // Get client info
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
  }

  // Get product info
  const { data: product } = await supabase
    .from("products")
    .select("*, categories(points_cost)")
    .eq("id", product_id)
    .single()

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
  }

  const pointsCost =
    (product.categories as { points_cost?: number } | null)?.points_cost ||
    product.points_cost

  // Check if client has enough points
  if (client.points < pointsCost) {
    return NextResponse.json(
      { error: "No tienes suficientes puntos para redimir este producto." },
      { status: 400 }
    )
  }

  // Check daily limit (60 points per day)
  const today = new Date().toISOString().split("T")[0]
  const currentRedeemedToday =
    client.last_redeem_date === today ? client.redeemed_today : 0

  if (currentRedeemedToday + pointsCost > 60) {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const waitMinutes = Math.ceil((midnight.getTime() - now.getTime()) / 60000)
    return NextResponse.json(
      {
        error: `Has alcanzado el limite diario de 60 puntos. Intenta nuevamente manana.`,
        waitMinutes,
      },
      { status: 400 }
    )
  }

  // Generate 8-character code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  // Create redemption (pending validation)
  const { data: redemption, error } = await supabase
    .from("redemptions")
    .insert({
      client_id: clientId,
      product_id,
      code,
      points_spent: pointsCost,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ redemption, code }, { status: 201 })
}

// GET: List redemptions (for admin)
export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get("client_id")
  const status = searchParams.get("status")
  const supabase = createAdminClient()

  let query = supabase
    .from("redemptions")
    .select("*, products(name, image_url), clients(full_name)")
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)
  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ redemptions: data })
}
