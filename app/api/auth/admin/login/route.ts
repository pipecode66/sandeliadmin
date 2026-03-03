import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeRole } from "@/lib/admin-roles"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "zivra@gmail.com").toLowerCase()

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 })
  }

  let adminProfile:
    | {
        id: string | null
        role: string
        full_name: string
        is_active: boolean
      }
    | null = null

  try {
    const adminSupabase = createAdminClient()
    const { data: adminData, error: adminError } = await adminSupabase
      .from("admin_users")
      .select("id, role, full_name, is_active")
      .eq("auth_user_id", data.user.id)
      .maybeSingle()

    if (adminError && adminError.code !== "42P01") {
      await supabase.auth.signOut()
      return NextResponse.json({ error: "No se pudo validar el usuario administrativo." }, { status: 500 })
    }

    if (!adminData && (data.user.email || "").toLowerCase() === ADMIN_EMAIL) {
      adminProfile = {
        id: null,
        role: "super_admin",
        full_name: "Administrador",
        is_active: true,
      }
    } else if (adminData) {
      adminProfile = adminData
    }
  } catch {
    await supabase.auth.signOut()
    return NextResponse.json({ error: "No se pudo validar el usuario administrativo." }, { status: 500 })
  }

  const role = normalizeRole(adminProfile?.role || null)
  if (!adminProfile || !adminProfile.is_active || !role) {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: "Usuario sin permisos administrativos habilitados." },
      { status: 403 },
    )
  }

  return NextResponse.json({
    user: data.user,
    admin: {
      id: adminProfile.id,
      role,
      full_name: adminProfile.full_name,
    },
  })
}

