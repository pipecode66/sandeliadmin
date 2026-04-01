import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVectorPosSyncState, updateVectorPosSyncState } from "@/lib/vectorpos-sync"
import { hasVectorPosCredentials } from "@/lib/vectorpos"

function parseStartFromInvoiceId(value: unknown) {
  if (value === undefined) return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return NaN
  }
  return Math.floor(parsed)
}

export async function GET() {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  try {
    const supabase = createAdminClient()
    const state = await getVectorPosSyncState(supabase)
    return NextResponse.json({
      state,
      has_credentials: hasVectorPosCredentials(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo consultar el estado de VectorPOS."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const parsedStart = parseStartFromInvoiceId(body.start_from_invoice_id)
  if (Number.isNaN(parsedStart)) {
    return NextResponse.json(
      { error: "start_from_invoice_id debe ser un número entero positivo o cero." },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()
    const currentState = await getVectorPosSyncState(supabase)
    const updates: Record<string, unknown> = {}

    if (typeof body.is_enabled === "boolean") {
      updates.is_enabled = body.is_enabled
    }

    if (parsedStart !== null) {
      updates.start_from_invoice_id = parsedStart
      if (
        currentState.last_checked_invoice_id === null ||
        Number(currentState.last_checked_invoice_id) < parsedStart
      ) {
        updates.last_checked_invoice_id = parsedStart
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay cambios validos para guardar." }, { status: 400 })
    }

    const state = await updateVectorPosSyncState(supabase, updates)
    return NextResponse.json({
      state,
      has_credentials: hasVectorPosCredentials(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la configuracion de VectorPOS."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
