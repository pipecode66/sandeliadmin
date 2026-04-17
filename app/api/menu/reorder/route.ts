import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { reorderMenuEntities } from "@/lib/menu-admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const ENTITY_TABLES = {
  category: "menu_categories",
  section: "menu_sections",
  product: "menu_products",
} as const

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json().catch(() => ({}))
  const entity = String(body.entity || "").trim() as keyof typeof ENTITY_TABLES
  const ids = Array.isArray(body.ids)
    ? body.ids.map((value: unknown) => String(value || "").trim()).filter(Boolean)
    : []

  if (!ENTITY_TABLES[entity] || ids.length === 0) {
    return NextResponse.json({ error: "Entidad e ids validos son obligatorios." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const reorderResult = await reorderMenuEntities(supabase, ENTITY_TABLES[entity], ids)
  if (!reorderResult.ok) {
    return NextResponse.json({ error: reorderResult.error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: `menu_${entity}`,
    action: "reorder",
    afterData: { ids },
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true })
}
