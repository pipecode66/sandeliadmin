import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { normalizeRole } from "@/lib/admin-roles"
import { createAuditLog } from "@/lib/audit-log"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const admin = await requireAdmin("gerente")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("admin_users")
    .select("id, auth_user_id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json(
        { error: "La tabla admin_users no existe. Ejecuta la migración 007." },
        { status: 500 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data || [] })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("super_admin")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const fullName = String(body.full_name || "").trim()
  const role = normalizeRole(body.role)
  const isActive = body.is_active !== false

  if (!email || !password || !fullName || !role) {
    return NextResponse.json(
      { error: "Debes enviar email, password, nombre completo y rol válido." },
      { status: 400 },
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña del usuario administrativo debe tener al menos 8 caracteres." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authResult.user) {
    return NextResponse.json(
      { error: authError?.message || "No se pudo crear el usuario en autenticación." },
      { status: 500 },
    )
  }

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      auth_user_id: authResult.user.id,
      email,
      full_name: fullName,
      role,
      is_active: isActive,
    })
    .select("id, auth_user_id, email, full_name, role, is_active, created_at")
    .single()

  if (error) {
    // Rollback del usuario de auth si falla el insert de la tabla de aplicación.
    await supabase.auth.admin.deleteUser(authResult.user.id).catch(() => undefined)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "admin_user",
    entityId: data.id,
    action: "create",
    afterData: data,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ user: data }, { status: 201 })
}
