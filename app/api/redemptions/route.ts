import { NextResponse } from "next/server"
import { requireAdmin, requireClient } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const clientSession = await requireClient()
  if (!clientSession.ok) return clientSession.response
  const clientId = clientSession.clientId

  const { product_id } = await request.json()
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from("clients")
    .select("id, points")
    .eq("id", clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, points_cost")
    .eq("id", product_id)
    .single()

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 })
  }

  const pointsCost = Number(product.points_cost || 0)

  if (client.points < pointsCost) {
    return NextResponse.json(
      { error: "No tienes suficientes puntos para redimir este producto." },
      { status: 400 },
    )
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

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

export async function GET(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get("client_id")
  const status = searchParams.get("status")
  const supabase = createAdminClient()

  let query = supabase
    .from("redemptions")
    .select(
      "*, products(name, image_url), clients(full_name), validated_by:admin_users!redemptions_validated_by_admin_id_fkey(full_name, email, role)",
    )
    .order("created_at", { ascending: false })

  if (clientId) query = query.eq("client_id", clientId)
  if (status) query = query.eq("status", status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ redemptions: data })
}
