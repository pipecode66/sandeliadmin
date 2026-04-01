import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  isMissingMenuTablesError,
  MENU_MISSING_TABLES_MESSAGE,
  parseSortOrder,
} from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")

  let query = supabase.from("menu_sections").select("*").order("sort_order").order("title")
  if (categoryId) query = query.eq("category_id", categoryId)

  const { data, error } = await query

  if (error) {
    if (isMissingMenuTablesError(error)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sections: data || [] })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const categoryId = String(body.category_id || "").trim()
  const title = String(body.title || "").trim()

  if (!categoryId || !title) {
    return NextResponse.json(
      { error: "Categoria y titulo de la subseccion son obligatorios." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: category } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle()

  if (!category) {
    return NextResponse.json({ error: "Categoria no encontrada." }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("menu_sections")
    .insert({
      category_id: categoryId,
      title,
      sort_order: parseSortOrder(body.sort_order),
    })
    .select("*")
    .single()

  if (error) {
    if (isMissingMenuTablesError(error)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_section",
    entityId: data.id,
    action: "create",
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ section: data }, { status: 201 })
}
