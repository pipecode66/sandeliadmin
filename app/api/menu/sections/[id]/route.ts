import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  isMissingMenuTablesError,
  MENU_MISSING_TABLES_MESSAGE,
  parseSortOrder,
} from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

async function categoryExists(supabase: ReturnType<typeof createAdminClient>, categoryId: string) {
  const { data } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle()

  return Boolean(data)
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

  const { data: current, error: currentError } = await supabase
    .from("menu_sections")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (currentError) {
    if (isMissingMenuTablesError(currentError)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: currentError.message }, { status: 500 })
  }

  if (!current) {
    return NextResponse.json({ error: "Subseccion no encontrada." }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === "string") updates.title = body.title.trim()
  if (body.sort_order !== undefined) updates.sort_order = parseSortOrder(body.sort_order)

  if (body.category_id !== undefined) {
    const categoryId = String(body.category_id || "").trim()
    if (!categoryId) {
      return NextResponse.json({ error: "La categoria es obligatoria." }, { status: 400 })
    }
    const exists = await categoryExists(supabase, categoryId)
    if (!exists) {
      return NextResponse.json({ error: "Categoria no encontrada." }, { status: 404 })
    }
    updates.category_id = categoryId
  }

  if (typeof updates.title === "string" && !String(updates.title).trim()) {
    return NextResponse.json({ error: "El titulo de la subseccion es obligatorio." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("menu_sections")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_section",
    entityId: id,
    action: "update",
    beforeData: current,
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ section: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("gerente")
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { data: current, error: currentError } = await supabase
    .from("menu_sections")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (currentError) {
    if (isMissingMenuTablesError(currentError)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: currentError.message }, { status: 500 })
  }

  if (!current) {
    return NextResponse.json({ error: "Subseccion no encontrada." }, { status: 404 })
  }

  const { count: productsCount } = await supabase
    .from("menu_products")
    .select("id", { count: "exact", head: true })
    .eq("section_id", id)

  const { error } = await supabase.from("menu_sections").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_section",
    entityId: id,
    action: "delete",
    beforeData: {
      ...current,
      related_records: {
        products_moved_to_category_root: productsCount || 0,
      },
    },
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true })
}
