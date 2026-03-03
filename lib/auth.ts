import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { AdminRole, hasMinimumRole, normalizeRole } from "@/lib/admin-roles"

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "zivra@gmail.com").toLowerCase()

type AdminProfile = {
  id: string | null
  auth_user_id: string
  email: string
  full_name: string
  role: AdminRole
  is_active: boolean
}

function unauthorized(message = "No autorizado") {
  return NextResponse.json({ error: message }, { status: 401 })
}

async function resolveAdminProfile(authUserId: string, email: string): Promise<AdminProfile | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, auth_user_id, email, full_name, role, is_active")
      .eq("auth_user_id", authUserId)
      .maybeSingle()

    if (error) {
      if (error.code === "42P01") {
        // Backward compatibility when migration is not applied yet.
        if (email === ADMIN_EMAIL) {
          return {
            id: null,
            auth_user_id: authUserId,
            email,
            full_name: "Administrador",
            role: "super_admin",
            is_active: true,
          }
        }
        return null
      }
      console.error("Error consultando admin_users:", error.message)
      return null
    }

    if (!data) {
      if (email === ADMIN_EMAIL) {
        return {
          id: null,
          auth_user_id: authUserId,
          email,
          full_name: "Administrador",
          role: "super_admin",
          is_active: true,
        }
      }
      return null
    }

    const normalizedRole = normalizeRole(data.role)
    if (!normalizedRole) return null

    return {
      id: data.id,
      auth_user_id: data.auth_user_id,
      email: data.email,
      full_name: data.full_name,
      role: normalizedRole,
      is_active: data.is_active,
    }
  } catch (error) {
    console.error("Error inesperado resolviendo perfil admin:", error)
    return null
  }
}

export async function requireAdmin(requiredRole: AdminRole = "caja") {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.id) {
    return { ok: false as const, response: unauthorized() }
  }

  const email = (user.email || "").toLowerCase()
  const adminProfile = await resolveAdminProfile(user.id, email)

  if (!adminProfile || !adminProfile.is_active) {
    return { ok: false as const, response: unauthorized("Usuario administrativo no habilitado.") }
  }

  if (!hasMinimumRole(adminProfile.role, requiredRole)) {
    return {
      ok: false as const,
      response: unauthorized("Tu rol no tiene permisos para esta accion."),
    }
  }

  return { ok: true as const, user, admin: adminProfile }
}

export async function getClientSessionId() {
  const cookieStore = await cookies()
  return cookieStore.get("sandeli_client_id")?.value || null
}

export async function requireClient() {
  const clientId = await getClientSessionId()
  if (!clientId) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    }
  }

  return { ok: true as const, clientId }
}

