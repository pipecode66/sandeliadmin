import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const PRODUCT_SELECT = "*, categories(name)"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")
  const supabase = createAdminClient()

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
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
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const categoryId = typeof body?.category_id === "string" ? body.category_id : ""
  const imageUrl =
    typeof body?.image_url === "string" && body.image_url.trim().length > 0
      ? body.image_url.trim()
      : null
  const pointsCost = Number(body?.points_cost)

  if (!name || !categoryId) {
    return NextResponse.json(
      { error: "Nombre y categoría son obligatorios." },
      { status: 400 },
    )
  }

  if (!Number.isFinite(pointsCost) || pointsCost < 0) {
    return NextResponse.json(
      { error: "Debes indicar una cantidad válida de puntos para el producto." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: category } = await supabase.from("categories").select("id").eq("id", categoryId).single()

  if (!category) {
    return NextResponse.json({ error: "Categoría no encontrada." }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      description: description || null,
      category_id: categoryId,
      image_url: imageUrl,
      points_cost: Math.round(pointsCost),
    })
    .select(PRODUCT_SELECT)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product: data }, { status: 201 })
}
