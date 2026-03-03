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
  return null
}

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
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
    .from("notifications")
    .select("*")
    .eq("id", id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: "Notificación no encontrada." }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.title === "string") updates.title = body.title.trim()
  if (typeof body.category === "string") updates.category = body.category.trim()
  if (typeof body.description === "string") updates.description = body.description.trim()
  if (typeof body.image_url === "string" || body.image_url === null) updates.image_url = body.image_url
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active
  if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at || null
  if (body.schedule_day !== undefined) updates.schedule_day = body.schedule_day ?? null
  if (body.schedule_month !== undefined) updates.schedule_month = body.schedule_month ?? null
  if (body.schedule_year !== undefined) updates.schedule_year = body.schedule_year ?? null

  if (body.schedule_type !== undefined) {
    const scheduleType = normalizeScheduleType(body.schedule_type)
    if (!scheduleType) {
      return NextResponse.json({ error: "schedule_type inválido." }, { status: 400 })
    }
    updates.schedule_type = scheduleType
  }

  const nextScheduleType = String(
    updates.schedule_type || current.schedule_type || "immediate",
  ) as "immediate" | "once" | "daily" | "monthly" | "yearly"

  const nextScheduledAt =
    updates.scheduled_at !== undefined ? updates.scheduled_at : current.scheduled_at
  const nextScheduleDay =
    updates.schedule_day !== undefined
      ? parseOptionalNumber(updates.schedule_day)
      : parseOptionalNumber(current.schedule_day)
  const nextScheduleMonth =
    updates.schedule_month !== undefined
      ? parseOptionalNumber(updates.schedule_month)
      : parseOptionalNumber(current.schedule_month)

  if (nextScheduleType === "once" && !nextScheduledAt) {
    return NextResponse.json(
      { error: "Para programación única debes indicar fecha y hora." },
      { status: 400 },
    )
  }

  if (nextScheduleType === "monthly" && (!nextScheduleDay || nextScheduleDay < 1 || nextScheduleDay > 31)) {
    return NextResponse.json(
      { error: "Para programación mensual debes indicar un día entre 1 y 31." },
      { status: 400 },
    )
  }

  if (nextScheduleType === "yearly") {
    if (!nextScheduleDay || nextScheduleDay < 1 || nextScheduleDay > 31) {
      return NextResponse.json(
        { error: "Para programación anual debes indicar un día entre 1 y 31." },
        { status: 400 },
      )
    }
    if (!nextScheduleMonth || nextScheduleMonth < 1 || nextScheduleMonth > 12) {
      return NextResponse.json(
        { error: "Para programación anual debes indicar un mes entre 1 y 12." },
        { status: 400 },
      )
    }
  }

  if (nextScheduleType === "immediate") {
    updates.scheduled_at = null
    updates.schedule_day = null
    updates.schedule_month = null
    updates.schedule_year = null
  }

  if (nextScheduleType === "daily") {
    updates.schedule_day = null
    updates.schedule_month = null
    updates.schedule_year = null
  }

  if (nextScheduleType === "monthly") {
    updates.scheduled_at = null
    updates.schedule_month = null
    updates.schedule_year = null
  }

  if (nextScheduleType === "yearly") {
    updates.scheduled_at = null
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", id)
    .select("*, admin_users(full_name, email)")
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "No se pudo actualizar la notificación." }, { status: 500 })
  }

  await createAuditLog({
    entityType: "notification",
    entityId: id,
    action: "update",
    beforeData: current,
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ notification: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { data: current } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  const { error } = await supabase.from("notifications").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "notification",
    entityId: id,
    action: "delete",
    beforeData: current || null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true })
}
