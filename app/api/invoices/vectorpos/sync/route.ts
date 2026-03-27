import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasVectorPosCredentials } from "@/lib/vectorpos"
import { runVectorPosSync } from "@/lib/vectorpos-sync"

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
    const supabase = createAdminClient()
    const result = await runVectorPosSync(supabase, auth.adminUserId)

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
