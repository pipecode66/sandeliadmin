import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const { data: current, error: currentError } = await supabase
    .from("clients")
    .select("id, points")
    .eq("id", id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}

  if (body.points !== undefined) {
    const parsed = Number(body.points)
    if (Number.isNaN(parsed)) {
      return NextResponse.json({ error: "points debe ser numerico." }, { status: 400 })
    }
    updates.points = Math.trunc(parsed)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios validos para aplicar en puntos." },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select("id, points")
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
