import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  if (!name) {
    return NextResponse.json(
      { error: "El nombre de la categoría es obligatorio." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id)

  if (count && count > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar una categoría que tiene productos asociados." },
      { status: 400 },
    )
  }

  const { error } = await supabase.from("categories").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
