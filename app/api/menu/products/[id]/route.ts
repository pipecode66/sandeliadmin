import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  isMissingMenuTablesError,
  MENU_MISSING_TABLES_MESSAGE,
  parsePriceCop,
  parseSortOrder,
} from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

async function validateRelations(
  supabase: ReturnType<typeof createAdminClient>,
  categoryId: string,
  sectionId: string | null,
) {
  const { data: category } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("id", categoryId)
    .maybeSingle()

  if (!category) {
    return { ok: false as const, error: "Categoria no encontrada.", status: 404 }
  }

  if (!sectionId) {
    return { ok: true as const }
  }

  const { data: section } = await supabase
    .from("menu_sections")
    .select("id, category_id")
    .eq("id", sectionId)
    .maybeSingle()

  if (!section) {
    return { ok: false as const, error: "Subseccion no encontrada.", status: 404 }
  }

  if (section.category_id !== categoryId) {
    return {
      ok: false as const,
      error: "La subsección no pertenece a la categoría seleccionada.",
      status: 400,
    }
  }

  return { ok: true as const }
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
    .from("menu_products")
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
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 })
  }

  const nextCategoryId =
    body.category_id !== undefined ? String(body.category_id || "").trim() : current.category_id
  const nextSectionId =
    body.section_id !== undefined ? (body.section_id ? String(body.section_id).trim() : null) : current.section_id
  const nextPrice =
    body.price_cop !== undefined ? parsePriceCop(body.price_cop) : Number(current.price_cop)

  if (!nextCategoryId || nextPrice === null) {
    return NextResponse.json(
      { error: "Categoria y precio valido son obligatorios." },
      { status: 400 },
    )
  }

  const relationCheck = await validateRelations(supabase, nextCategoryId, nextSectionId)
  if (!relationCheck.ok) {
    return NextResponse.json({ error: relationCheck.error }, { status: relationCheck.status })
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    category_id: nextCategoryId,
    section_id: nextSectionId,
    price_cop: nextPrice,
  }

  if (typeof body.title === "string") updates.title = body.title.trim()
  if (typeof body.description === "string") updates.description = body.description.trim()
  if (body.image_url !== undefined) {
    updates.image_url =
      typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null
  }
  if (body.sort_order !== undefined) updates.sort_order = parseSortOrder(body.sort_order)

  if (typeof updates.title === "string" && !String(updates.title).trim()) {
    return NextResponse.json({ error: "El título del producto es obligatorio." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("menu_products")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_product",
    entityId: id,
    action: "update",
    beforeData: current,
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ product: data })
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
    .from("menu_products")
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
    return NextResponse.json({ error: "Producto no encontrado." }, { status: 404 })
  }

  const { error } = await supabase.from("menu_products").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_product",
    entityId: id,
    action: "delete",
    beforeData: current,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true })
}
