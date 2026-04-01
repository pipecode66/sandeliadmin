import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  isMissingMenuTablesError,
  MENU_MISSING_TABLES_MESSAGE,
  normalizeMenuIconKey,
  parseSortOrder,
} from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

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
    .from("menu_categories")
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
    return NextResponse.json({ error: "Categoria no encontrada." }, { status: 404 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.title === "string") updates.title = body.title.trim()
  if (typeof body.blurb === "string") updates.blurb = body.blurb.trim()
  if (body.icon_key !== undefined) updates.icon_key = normalizeMenuIconKey(body.icon_key)
  if (body.banner_image_url !== undefined) {
    updates.banner_image_url =
      typeof body.banner_image_url === "string" && body.banner_image_url.trim()
        ? body.banner_image_url.trim()
        : null
  }
  if (body.sort_order !== undefined) updates.sort_order = parseSortOrder(body.sort_order)

  if (typeof updates.title === "string" && !String(updates.title).trim()) {
    return NextResponse.json({ error: "El título de la categoría es obligatorio." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_category",
    entityId: id,
    action: "update",
    beforeData: current,
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ category: data })
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
    .from("menu_categories")
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
    return NextResponse.json({ error: "Categoria no encontrada." }, { status: 404 })
  }

  const { count: sectionsCount } = await supabase
    .from("menu_sections")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)

  const { count: productsCount } = await supabase
    .from("menu_products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)

  const { error } = await supabase.from("menu_categories").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_category",
    entityId: id,
    action: "delete",
    beforeData: {
      ...current,
      related_records: {
        sections: sectionsCount || 0,
        products: productsCount || 0,
      },
    },
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true })
}
