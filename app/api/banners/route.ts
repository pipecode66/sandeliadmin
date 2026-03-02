import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeAll = searchParams.get("all") === "true"
  const supabase = createAdminClient()

  let query = supabase
    .from("banners")
    .select("*")
    .order("sort_order")

  if (includeAll) {
    const admin = await requireAdmin()
    if (!admin.ok) return admin.response
  } else {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ banners: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const body = await request.json()
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("banners")
    .insert(body)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ banner: data }, { status: 201 })
}
