import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const PRODUCT_SELECT = "*, categories(name)"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json({ product: data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()
  const payload: Record<string, unknown> = {}

  if (typeof body?.name === "string") {
    const name = body.name.trim()
    if (!name) {
      return NextResponse.json(
        { error: "El nombre del producto no puede quedar vacio." },
        { status: 400 },
      )
    }
    payload.name = name
  }

  if (typeof body?.description === "string") {
    payload.description = body.description.trim() || null
  }

  if (body?.image_url === null || typeof body?.image_url === "string") {
    payload.image_url =
      typeof body.image_url === "string" && body.image_url.trim().length > 0
        ? body.image_url.trim()
        : null
  }

  if (body?.points_cost !== undefined) {
    const pointsCost = Number(body.points_cost)
    if (!Number.isFinite(pointsCost) || pointsCost < 0) {
      return NextResponse.json(
        { error: "Debes indicar una cantidad valida de puntos para el producto." },
        { status: 400 },
      )
    }

    payload.points_cost = Math.round(pointsCost)
  }

  if (typeof body?.category_id === "string" && body.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", body.category_id)
      .single()

    if (!category) {
      return NextResponse.json({ error: "Categoria no encontrada." }, { status: 404 })
    }

    payload.category_id = body.category_id
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "No se recibieron cambios para actualizar el producto." },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from("products")
    .update(payload)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ product: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
