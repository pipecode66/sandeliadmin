import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { createAdminClient } from "@/lib/supabase/admin"

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
    .from("clients")
    .select("id, points, redeemed_today, last_redeem_date, daily_limit_override")
    .eq("id", id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  if (body.points !== undefined) {
    const parsed = Number(body.points)
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: "points debe ser numérico." }, { status: 400 })
    }
    updates.points = Math.trunc(parsed)
  }

  if (body.redeemed_today !== undefined) {
    const parsed = Number(body.redeemed_today)
    if (Number.isNaN(parsed)) {
      return NextResponse.json(
        { error: "redeemed_today debe ser numérico." },
        { status: 400 },
      )
    }
    updates.redeemed_today = Math.max(0, Math.trunc(parsed))
    updates.last_redeem_date = new Date().toISOString().split("T")[0]
  }

  if (typeof body.daily_limit_override === "boolean") {
    updates.daily_limit_override = body.daily_limit_override
  }

  if (body.reset_daily_limit === true) {
    updates.redeemed_today = 0
    updates.last_redeem_date = null
    updates.daily_limit_override = false
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios válidos para aplicar en puntos/límites." },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select("id, points, redeemed_today, last_redeem_date, daily_limit_override")
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "No se pudieron actualizar los puntos." },
      { status: 500 },
    )
  }

  await createAuditLog({
    entityType: "client",
    entityId: id,
    action: "update_points",
    beforeData: current,
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ client: data })
}
