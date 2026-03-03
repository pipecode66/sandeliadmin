import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit-log"

function normalizeScheduleType(value: unknown) {
  if (value === "immediate") return value
  if (value === "once") return value
  if (value === "daily") return value
  if (value === "monthly") return value
  if (value === "yearly") return value
  return "immediate" as const
}

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

export async function GET() {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("*, admin_users(full_name, email)")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "Tabla notifications no existe. Ejecuta la migracion 007." },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notifications: data || [] })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const title = String(body.title || "").trim()
  const category = String(body.category || "").trim()
  const description = String(body.description || "").trim()

  if (!title || !category || !description) {
    return NextResponse.json(
      { error: "Título, categoría y descripción son obligatorios." },
      { status: 400 },
    )
  }

  const scheduleType = normalizeScheduleType(body.schedule_type)
  const scheduleDay = parseOptionalNumber(body.schedule_day)
  const scheduleMonth = parseOptionalNumber(body.schedule_month)
  const scheduleYear = parseOptionalNumber(body.schedule_year)
  const scheduledAt = body.scheduled_at ? String(body.scheduled_at) : null

  if (scheduleType === "once" && !scheduledAt) {
    return NextResponse.json(
      { error: "Para programación única debes indicar fecha y hora." },
      { status: 400 },
    )
  }

  if (scheduleType === "monthly" && (!scheduleDay || scheduleDay < 1 || scheduleDay > 31)) {
    return NextResponse.json(
      { error: "Para programación mensual debes indicar un día entre 1 y 31." },
      { status: 400 },
    )
  }

  if (scheduleType === "yearly") {
    if (!scheduleDay || scheduleDay < 1 || scheduleDay > 31) {
      return NextResponse.json(
        { error: "Para programación anual debes indicar un día entre 1 y 31." },
        { status: 400 },
      )
    }
    if (!scheduleMonth || scheduleMonth < 1 || scheduleMonth > 12) {
      return NextResponse.json(
        { error: "Para programación anual debes indicar un mes entre 1 y 12." },
        { status: 400 },
      )
    }
  }

  const payload = {
    title,
    category,
    description,
    image_url: body.image_url || null,
    schedule_type: scheduleType,
    scheduled_at: scheduleType === "once" || scheduleType === "daily" ? scheduledAt : null,
    schedule_day:
      scheduleType === "monthly" || scheduleType === "yearly" ? scheduleDay : null,
    schedule_month: scheduleType === "yearly" ? scheduleMonth : null,
    schedule_year: scheduleType === "yearly" ? scheduleYear : null,
    is_active: body.is_active !== false,
    created_by_admin_id: admin.admin.id,
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select("*, admin_users(full_name, email)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "notification",
    entityId: data.id,
    action: "create",
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ notification: data }, { status: 201 })
}
