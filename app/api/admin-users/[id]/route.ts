import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { normalizeRole } from "@/lib/admin-roles"
import { createAuditLog } from "@/lib/audit-log"
import { createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("super_admin")
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()

  const fullName = body.full_name ? String(body.full_name).trim() : undefined
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined
  const role = body.role !== undefined ? normalizeRole(body.role) : undefined
  const password = body.password ? String(body.password) : undefined
  const isActive = typeof body.is_active === "boolean" ? body.is_active : undefined

  if (body.role !== undefined && !role) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: current, error: currentError } = await supabase
    .from("admin_users")
    .select("id, auth_user_id, email, full_name, role, is_active")
    .eq("id", id)
    .single()

  if (currentError || !current) {
    return NextResponse.json(
      { error: "Usuario administrativo no encontrado." },
      { status: 404 },
    )
  }

  const updates: Record<string, unknown> = {}
  if (fullName !== undefined) updates.full_name = fullName
  if (email !== undefined) updates.email = email
  if (role !== undefined) updates.role = role
  if (isActive !== undefined) updates.is_active = isActive

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from("admin_users")
      .update(updates)
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  if (email !== undefined || password !== undefined) {
    const updateAuthPayload: { email?: string; password?: string } = {}

    if (email !== undefined) updateAuthPayload.email = email
    if (password !== undefined && password.length >= 8) {
      updateAuthPayload.password = password
    } else if (password !== undefined) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 8 caracteres." },
        { status: 400 },
      )
    }

    const { error: authError } = await supabase.auth.admin.updateUserById(
      current.auth_user_id,
      updateAuthPayload,
    )

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, auth_user_id, email, full_name, role, is_active, created_at")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: "No se pudo cargar el usuario actualizado." },
      { status: 500 },
    )
  }

  await createAuditLog({
    entityType: "admin_user",
    entityId: id,
    action: "update",
    beforeData: current,
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ user: data })
}
