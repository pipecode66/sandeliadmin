import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasVectorPosCredentials } from "@/lib/vectorpos"
import { runVectorPosSync, type VectorPosSyncOptions } from "@/lib/vectorpos-sync"

export const dynamic = "force-dynamic"

function hasValidCronSecret(request: Request) {
  const configuredSecret = process.env.VECTORPOS_CRON_SECRET || process.env.CRON_SECRET
  if (!configuredSecret) return false

  const authHeader = request.headers.get("authorization") || ""
  const customHeader = request.headers.get("x-cron-secret") || ""
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""

  return bearerToken === configuredSecret || customHeader === configuredSecret
}

async function authorizeSync(request: Request) {
  if (hasValidCronSecret(request)) {
    return { ok: true as const, adminUserId: null }
  }

  const admin = await requireAdmin("caja")
  if (!admin.ok) {
    return { ok: false as const, response: admin.response }
  }

  return { ok: true as const, adminUserId: admin.admin.id }
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

function parseNonNegativeInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.floor(parsed)
}

async function parseSyncOptions(request: Request): Promise<{
  options: VectorPosSyncOptions
  validationError?: string
}> {
  if (request.method !== "POST") {
    return { options: {} }
  }

  const rawBody = await request.text()
  if (!rawBody.trim()) {
    return { options: {} }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return { options: {}, validationError: "El cuerpo del escaneo manual no es un JSON válido." }
  }

  const scanCount = parsePositiveInteger(body.scan_count)
  const startInvoiceId = parseNonNegativeInteger(body.start_invoice_id)

  if (body.scan_count !== undefined && scanCount === null) {
    return { options: {}, validationError: "scan_count debe ser un número entero positivo." }
  }

  if (
    body.start_invoice_id !== undefined &&
    body.start_invoice_id !== null &&
    body.start_invoice_id !== "" &&
    startInvoiceId === null
  ) {
    return { options: {}, validationError: "start_invoice_id debe ser un número entero positivo o cero." }
  }

  if (scanCount === null && startInvoiceId === null) {
    return { options: {} }
  }

  return {
    options: {
      startInvoiceId,
      maxAttempts: scanCount,
      maxMissStreak: scanCount === null ? undefined : Math.max(150, scanCount + 50),
    },
  }
}

async function handleSync(request: Request) {
  const auth = await authorizeSync(request)
  if (!auth.ok) return auth.response

  if (!hasVectorPosCredentials()) {
    return NextResponse.json(
      { error: "Faltan VECTORPOS_API_USER o VECTORPOS_API_KEY en el entorno." },
      { status: 500 },
    )
  }

  try {
    const parsed = await parseSyncOptions(request)
    if (parsed.validationError) {
      return NextResponse.json({ error: parsed.validationError }, { status: 400 })
    }

    const supabase = createAdminClient()
    const result = await runVectorPosSync(supabase, auth.adminUserId, parsed.options)

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          state: result.state,
          summary: result.summary,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar VectorPOS."
    const status = message.includes("desactivada") ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(request: Request) {
  return handleSync(request)
}

export async function POST(request: Request) {
  return handleSync(request)
}
