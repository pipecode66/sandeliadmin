import { requireAdmin } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  return NextResponse.json({
    admin: {
      id: admin.admin.id,
      auth_user_id: admin.admin.auth_user_id,
      email: admin.admin.email,
      full_name: admin.admin.full_name,
      role: admin.admin.role,
      is_active: admin.admin.is_active,
    },
  })
}
