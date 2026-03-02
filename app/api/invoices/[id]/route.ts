import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(full_name, email, phone)")
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 })
  }

  return NextResponse.json({ invoice: data })
}
