import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, created_at, products(count)")
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ categories: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

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
    .insert({ name })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: data }, { status: 201 })
}
