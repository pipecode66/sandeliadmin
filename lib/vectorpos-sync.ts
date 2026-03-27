import type { SupabaseClient } from "@supabase/supabase-js"
import { createAuditLog } from "@/lib/audit-log"
import { ADMIN_INVOICE_SELECT, calculateInvoicePoints } from "@/lib/invoice-utils"
import {
  buildPhoneCandidates,
  fetchVectorPosInvoice,
  normalizePhoneForStorage,
  parseVectorPosAmount,
} from "@/lib/vectorpos"

type IntegrationSyncStateRow = {
  provider: string
  is_enabled: boolean
  start_from_invoice_id: number
  last_checked_invoice_id: number | null
  last_imported_invoice_id: number | null
  last_run_at: string | null
  last_error: string | null
  miss_streak: number
  created_at?: string
  updated_at?: string
}

type BasicClient = {
  id: string
  full_name: string
  phone: string
  points: number
}

type BasicInvoice = {
  id: string
  client_id: string | null
  invoice_number: string
  amount: number
  points_earned: number
  source: string | null
  source_invoice_id: string | null
  source_client_phone: string | null
  source_client_name: string | null
  match_status: string | null
  points_applied_at: string | null
}

type ImportResult =
  | { status: "not_found"; sourceInvoiceId: number }
  | {
      status: "duplicate"
      sourceInvoiceId: number
      invoiceId: string
      matched: boolean
      pointsApplied: boolean
    }
  | {
      status: "imported"
      sourceInvoiceId: number
      invoiceId: string
      matched: boolean
      pointsApplied: boolean
      pointsEarned: number
    }

const VECTORPOS_PROVIDER = "vectorpos"

function coerceState(row?: Partial<IntegrationSyncStateRow> | null): IntegrationSyncStateRow {
  return {
    provider: VECTORPOS_PROVIDER,
    is_enabled: Boolean(row?.is_enabled),
    start_from_invoice_id: Number(row?.start_from_invoice_id || 0),
    last_checked_invoice_id:
      row?.last_checked_invoice_id === null || row?.last_checked_invoice_id === undefined
        ? null
        : Number(row.last_checked_invoice_id),
    last_imported_invoice_id:
      row?.last_imported_invoice_id === null || row?.last_imported_invoice_id === undefined
        ? null
        : Number(row.last_imported_invoice_id),
    last_run_at: row?.last_run_at || null,
    last_error: row?.last_error || null,
    miss_streak: Number(row?.miss_streak || 0),
    created_at: row?.created_at,
    updated_at: row?.updated_at,
  }
}

async function getClientById(supabase: SupabaseClient, clientId: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, phone, points")
    .eq("id", clientId)
    .single<BasicClient>()

  if (error || !data) {
    throw new Error("Cliente no encontrado.")
  }

  return data
}

async function findClientByPhone(supabase: SupabaseClient, rawPhone?: string | null) {
  const candidates = buildPhoneCandidates(rawPhone)
  if (candidates.length === 0) return null

  const { data, error } = await supabase
    .from("clients")
    .select("id, full_name, phone, points")
    .in("phone", candidates)
    .limit(10)

  if (error || !data || data.length === 0) {
    return null
  }

  const ordered = [...data].sort((left, right) => {
    const leftIndex = candidates.indexOf(String(left.phone || ""))
    const rightIndex = candidates.indexOf(String(right.phone || ""))
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex)
  })

  return ordered[0] as BasicClient
}

async function applyPointsToInvoiceIfNeeded(
  supabase: SupabaseClient,
  invoice: Pick<BasicInvoice, "id" | "points_earned" | "points_applied_at">,
  clientId: string,
) {
  if (invoice.points_applied_at) {
    return {
      pointsApplied: true,
      appliedAt: invoice.points_applied_at,
      previousPoints: null as number | null,
      newPoints: null as number | null,
    }
  }

  const appliedAt = new Date().toISOString()
  if (Number(invoice.points_earned || 0) <= 0) {
    const { error: markError } = await supabase
      .from("invoices")
      .update({ points_applied_at: appliedAt })
      .eq("id", invoice.id)

    if (markError) {
      throw new Error(markError.message)
    }

    return {
      pointsApplied: true,
      appliedAt,
      previousPoints: null,
      newPoints: null,
    }
  }

  const client = await getClientById(supabase, clientId)
  const previousPoints = Number(client.points || 0)
  const newPoints = previousPoints + Number(invoice.points_earned || 0)

  const { error: clientError } = await supabase
    .from("clients")
    .update({ points: newPoints })
    .eq("id", clientId)

  if (clientError) {
    throw new Error(clientError.message)
  }

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({ points_applied_at: appliedAt })
    .eq("id", invoice.id)

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }

  return {
    pointsApplied: true,
    appliedAt,
    previousPoints,
    newPoints,
  }
}

async function getExistingVectorPosInvoice(supabase: SupabaseClient, sourceInvoiceId: number) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, client_id, invoice_number, amount, points_earned, source, source_invoice_id, source_client_phone, source_client_name, match_status, points_applied_at",
    )
    .eq("source", VECTORPOS_PROVIDER)
    .eq("source_invoice_id", String(sourceInvoiceId))
    .maybeSingle<BasicInvoice>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getVectorPosSyncState(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("integration_sync_state")
    .select("provider, is_enabled, start_from_invoice_id, last_checked_invoice_id, last_imported_invoice_id, last_run_at, last_error, miss_streak, created_at, updated_at")
    .eq("provider", VECTORPOS_PROVIDER)
    .maybeSingle<IntegrationSyncStateRow>()

  if (error) {
    throw new Error(error.message)
  }

  if (data) return coerceState(data)

  const defaults = coerceState(null)
  const { data: inserted, error: insertError } = await supabase
    .from("integration_sync_state")
    .insert(defaults)
    .select("provider, is_enabled, start_from_invoice_id, last_checked_invoice_id, last_imported_invoice_id, last_run_at, last_error, miss_streak, created_at, updated_at")
    .single<IntegrationSyncStateRow>()

  if (insertError || !inserted) {
    throw new Error(insertError?.message || "No se pudo inicializar el estado de sincronizacion.")
  }

  return coerceState(inserted)
}

export async function updateVectorPosSyncState(
  supabase: SupabaseClient,
  updates: Partial<IntegrationSyncStateRow>,
) {
  const payload = {
    provider: VECTORPOS_PROVIDER,
    ...updates,
  }

  const { data, error } = await supabase
    .from("integration_sync_state")
    .upsert(payload, { onConflict: "provider" })
    .select("provider, is_enabled, start_from_invoice_id, last_checked_invoice_id, last_imported_invoice_id, last_run_at, last_error, miss_streak, created_at, updated_at")
    .single<IntegrationSyncStateRow>()

  if (error || !data) {
    throw new Error(error?.message || "No se pudo guardar el estado de VectorPOS.")
  }

  return coerceState(data)
}

export async function importVectorPosInvoiceById(
  supabase: SupabaseClient,
  sourceInvoiceId: number,
  adminUserId?: string | null,
): Promise<ImportResult> {
  const remote = await fetchVectorPosInvoice(sourceInvoiceId)
  if (!remote.exists) {
    return { status: "not_found", sourceInvoiceId }
  }

  const existing = await getExistingVectorPosInvoice(supabase, sourceInvoiceId)
  if (existing) {
    let pointsApplied = Boolean(existing.points_applied_at)
    if (existing.client_id && !existing.points_applied_at) {
      await applyPointsToInvoiceIfNeeded(supabase, existing, existing.client_id)
      pointsApplied = true
    }

    return {
      status: "duplicate",
      sourceInvoiceId,
      invoiceId: existing.id,
      matched: existing.match_status === "matched",
      pointsApplied,
    }
  }

  const sourceClientPhone = normalizePhoneForStorage(remote.invoice.client?.phone)
  const sourceClientName = String(remote.invoice.client?.name || "").trim() || null
  const amount = parseVectorPosAmount(remote.invoice)
  const pointsEarned = calculateInvoicePoints(amount)
  const matchedClient = sourceClientPhone
    ? await findClientByPhone(supabase, sourceClientPhone)
    : null
  const importedAt = new Date().toISOString()

  const { data: insertedInvoice, error: insertError } = await supabase
    .from("invoices")
    .insert({
      client_id: matchedClient?.id || null,
      invoice_number: String(remote.invoice.id),
      amount,
      points_earned: pointsEarned,
      source: VECTORPOS_PROVIDER,
      source_invoice_id: String(remote.invoice.id),
      source_payload: remote.invoice,
      source_client_phone: sourceClientPhone || null,
      source_client_name: sourceClientName,
      match_status: matchedClient ? "matched" : "unmatched",
      imported_at: importedAt,
      points_applied_at: null,
      issued_by_admin_id: null,
    })
    .select(
      "id, client_id, invoice_number, amount, points_earned, source, source_invoice_id, source_client_phone, source_client_name, match_status, points_applied_at",
    )
    .single<BasicInvoice>()

  if (insertError || !insertedInvoice) {
    if (insertError?.code === "23505") {
      const duplicate = await getExistingVectorPosInvoice(supabase, sourceInvoiceId)
      if (duplicate) {
        return {
          status: "duplicate",
          sourceInvoiceId,
          invoiceId: duplicate.id,
          matched: duplicate.match_status === "matched",
          pointsApplied: Boolean(duplicate.points_applied_at),
        }
      }
    }

    throw new Error(insertError?.message || "No se pudo importar la factura de VectorPOS.")
  }

  let pointsApplied = false
  if (matchedClient) {
    await applyPointsToInvoiceIfNeeded(supabase, insertedInvoice, matchedClient.id)
    pointsApplied = true
  }

  await createAuditLog({
    entityType: "invoice",
    entityId: insertedInvoice.id,
    action: matchedClient ? "import_vectorpos_matched" : "import_vectorpos_unmatched",
    afterData: {
      ...insertedInvoice,
      imported_at: importedAt,
      points_applied: pointsApplied,
      source_client_phone: sourceClientPhone || null,
      source_client_name: sourceClientName,
    },
    adminUserId: adminUserId || null,
  })

  return {
    status: "imported",
    sourceInvoiceId,
    invoiceId: insertedInvoice.id,
    matched: Boolean(matchedClient),
    pointsApplied,
    pointsEarned,
  }
}

export async function assignVectorPosInvoiceClient(
  supabase: SupabaseClient,
  invoiceId: string,
  clientId: string,
  adminUserId?: string | null,
  comment?: string | null,
) {
  const { data: currentInvoice, error: invoiceError } = await supabase
    .from("invoices")
    .select(
      "id, client_id, invoice_number, amount, points_earned, source, source_invoice_id, source_client_phone, source_client_name, match_status, points_applied_at",
    )
    .eq("id", invoiceId)
    .maybeSingle<BasicInvoice>()

  if (invoiceError) {
    throw new Error(invoiceError.message)
  }

  if (!currentInvoice) {
    throw new Error("Factura no encontrada.")
  }

  if (currentInvoice.source !== VECTORPOS_PROVIDER) {
    throw new Error("Solo puedes asignar clientes a facturas importadas desde VectorPOS.")
  }

  if (currentInvoice.client_id && currentInvoice.points_applied_at) {
    throw new Error("Esta factura ya tiene un cliente asignado y sus puntos aplicados.")
  }

  await getClientById(supabase, clientId)

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      client_id: clientId,
      match_status: "matched",
    })
    .eq("id", invoiceId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  let pointsAppliedNow = false
  if (!currentInvoice.points_applied_at) {
    await applyPointsToInvoiceIfNeeded(supabase, currentInvoice, clientId)
    pointsAppliedNow = true
  }

  const { data: updatedInvoice, error: selectError } = await supabase
    .from("invoices")
    .select(ADMIN_INVOICE_SELECT)
    .eq("id", invoiceId)
    .single()

  if (selectError || !updatedInvoice) {
    throw new Error(selectError?.message || "No se pudo recuperar la factura actualizada.")
  }

  await createAuditLog({
    entityType: "invoice",
    entityId: invoiceId,
    action: "assign_client_vectorpos",
    beforeData: currentInvoice,
    afterData: updatedInvoice,
    comment: comment || null,
    adminUserId: adminUserId || null,
  })

  return {
    invoice: updatedInvoice,
    pointsAppliedNow,
    pointsEarned: Number(currentInvoice.points_earned || 0),
  }
}

export async function runVectorPosSync(
  supabase: SupabaseClient,
  adminUserId?: string | null,
) {
  const currentState = await getVectorPosSyncState(supabase)
  if (!currentState.is_enabled) {
    throw new Error("La sincronizacion de VectorPOS esta desactivada.")
  }

  const startedAt = new Date().toISOString()
  let currentInvoiceId =
    Math.max(
      Number(currentState.start_from_invoice_id || 0),
      Number(currentState.last_checked_invoice_id || 0),
    ) + 1
  let attempts = 0
  let missStreak = 0
  let imported = 0
  let duplicates = 0
  let matched = 0
  let unmatched = 0
  let pointsApplied = 0
  let lastImportedInvoiceId = currentState.last_imported_invoice_id

  try {
    while (attempts < 50 && missStreak < 20) {
      const result = await importVectorPosInvoiceById(supabase, currentInvoiceId, adminUserId)
      attempts += 1

      if (result.status === "not_found") {
        missStreak += 1
        currentInvoiceId += 1
        continue
      }

      missStreak = 0
      lastImportedInvoiceId = result.sourceInvoiceId

      if (result.status === "duplicate") {
        duplicates += 1
        if (result.matched) matched += 1
        if (result.pointsApplied) pointsApplied += 1
      } else {
        imported += 1
        if (result.matched) {
          matched += 1
        } else {
          unmatched += 1
        }
        if (result.pointsApplied) pointsApplied += 1
      }

      currentInvoiceId += 1
    }

    const updatedState = await updateVectorPosSyncState(supabase, {
      provider: VECTORPOS_PROVIDER,
      last_checked_invoice_id: currentInvoiceId - 1,
      last_imported_invoice_id: lastImportedInvoiceId,
      last_run_at: startedAt,
      last_error: null,
      miss_streak: missStreak,
    })

    return {
      state: updatedState,
      summary: {
        attempts,
        imported,
        duplicates,
        matched,
        unmatched,
        pointsApplied,
        missStreak,
        startedAt,
        endedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido en sincronizacion de VectorPOS."

    const updatedState = await updateVectorPosSyncState(supabase, {
      provider: VECTORPOS_PROVIDER,
      last_checked_invoice_id: currentInvoiceId > 0 ? currentInvoiceId - 1 : currentState.last_checked_invoice_id,
      last_imported_invoice_id: lastImportedInvoiceId,
      last_run_at: startedAt,
      last_error: message,
      miss_streak: missStreak,
    })

    return {
      state: updatedState,
      summary: {
        attempts,
        imported,
        duplicates,
        matched,
        unmatched,
        pointsApplied,
        missStreak,
        startedAt,
        endedAt: new Date().toISOString(),
      },
      error: message,
    }
  }
}
