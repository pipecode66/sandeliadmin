import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")
  const supabase = createAdminClient()

  let query = supabase
    .from("products")
    .select("*, categories(name, points_cost)")
    .order("created_at", { ascending: false })

  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const body = await request.json()
  const { category_id } = body
  if (!body?.name || !category_id) {
    return NextResponse.json(
      { error: "Nombre y categoria son obligatorios." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: category } = await supabase
    .from("categories")
    .select("points_cost")
    .eq("id", category_id)
    .single()

  if (!category) {
    return NextResponse.json({ error: "Categoria no encontrada." }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...body,
      points_cost: category.points_cost,
    })
    .select("*, categories(name, points_cost)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product: data }, { status: 201 })
}
