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
      error: "La subseccion no pertenece a la categoria seleccionada.",
      status: 400,
    }
  }

  return { ok: true as const }
}

export async function GET(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get("category_id")
  const supabase = createAdminClient()

  let query = supabase.from("menu_products").select("*").order("sort_order").order("title")
  if (categoryId) query = query.eq("category_id", categoryId)

  const { data, error } = await query

  if (error) {
    if (isMissingMenuTablesError(error)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ products: data || [] })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const categoryId = String(body.category_id || "").trim()
  const sectionId = body.section_id ? String(body.section_id).trim() : null
  const title = String(body.title || "").trim()
  const description = String(body.description || "").trim()
  const priceCop = parsePriceCop(body.price_cop)

  if (!categoryId || !title || priceCop === null) {
    return NextResponse.json(
      { error: "Categoria, titulo y precio valido son obligatorios." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const relationCheck = await validateRelations(supabase, categoryId, sectionId)
  if (!relationCheck.ok) {
    return NextResponse.json({ error: relationCheck.error }, { status: relationCheck.status })
  }

  const { data, error } = await supabase
    .from("menu_products")
    .insert({
      category_id: categoryId,
      section_id: sectionId,
      title,
      description,
      price_cop: priceCop,
      image_url:
        typeof body.image_url === "string" && body.image_url.trim() ? body.image_url.trim() : null,
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
    entityType: "menu_product",
    entityId: data.id,
    action: "create",
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ product: data }, { status: 201 })
}
