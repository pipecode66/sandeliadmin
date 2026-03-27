import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { assignVectorPosInvoiceClient } from "@/lib/vectorpos-sync"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const clientId = String(body.client_id || "").trim()

  if (!clientId) {
    return NextResponse.json({ error: "Debes enviar client_id." }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const result = await assignVectorPosInvoiceClient(
      supabase,
      id,
      clientId,
      admin.admin.id,
      typeof body.comment === "string" ? body.comment : null,
    )

    return NextResponse.json({
      invoice: result.invoice,
      points_earned: result.pointsEarned,
      points_applied_now: result.pointsAppliedNow,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo asignar el cliente a la factura."
    const status =
      message.includes("no encontrada") || message.includes("no encontrado")
        ? 404
        : message.includes("Solo puedes")
          ? 400
          : 400

    return NextResponse.json({ error: message }, { status })
  }
}
