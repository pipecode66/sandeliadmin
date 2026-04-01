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

export async function GET() {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .order("sort_order")
    .order("title")

  if (error) {
    if (isMissingMenuTablesError(error)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ categories: data || [] })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const title = String(body.title || "").trim()
  const blurb = String(body.blurb || "").trim()

  if (!title) {
    return NextResponse.json({ error: "El título de la categoría es obligatorio." }, { status: 400 })
  }

  const payload = {
    title,
    blurb,
    icon_key: normalizeMenuIconKey(body.icon_key),
    banner_image_url:
      typeof body.banner_image_url === "string" && body.banner_image_url.trim()
        ? body.banner_image_url.trim()
        : null,
    sort_order: parseSortOrder(body.sort_order),
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("menu_categories")
    .insert(payload)
    .select("*")
    .single()

  if (error) {
    if (isMissingMenuTablesError(error)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_category",
    entityId: data.id,
    action: "create",
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ category: data }, { status: 201 })
}
