import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get("entity_type")
  const entityId = searchParams.get("entity_id")
  const limit = Math.min(Number(searchParams.get("limit") || "100"), 500)

  const supabase = createAdminClient()
  let query = supabase
    .from("audit_logs")
    .select("*, admin_users(full_name, email, role)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (entityType) query = query.eq("entity_type", entityType)
  if (entityId) query = query.eq("entity_id", entityId)

  const { data, error } = await query
  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Tabla audit_logs no existe. Ejecuta la migracion 007." },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data || [] })
}

