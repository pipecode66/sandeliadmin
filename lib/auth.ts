import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "zivra@gmail.com").toLowerCase()

export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    }
  }

  return { ok: true as const, user }
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
