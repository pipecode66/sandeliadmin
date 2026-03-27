import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { ADMIN_INVOICE_SELECT } from "@/lib/invoice-utils"
import { createAdminClient } from "@/lib/supabase/admin"

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
    .select(ADMIN_INVOICE_SELECT)
    .eq("id", id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Factura no encontrada." }, { status: 404 })
  }

  return NextResponse.json({ invoice: data })
}
