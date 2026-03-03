import { createAdminClient } from "@/lib/supabase/admin"

type AuditPayload = {
  entityType: string
  entityId?: string | null
  action: string
  beforeData?: unknown
  afterData?: unknown
  comment?: string | null
  adminUserId?: string | null
}

export async function createAuditLog(payload: AuditPayload) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("audit_logs").insert({
      entity_type: payload.entityType,
      entity_id: payload.entityId || null,
      action: payload.action,
      before_data: payload.beforeData ?? null,
      after_data: payload.afterData ?? null,
      comment: payload.comment || null,
      admin_user_id: payload.adminUserId || null,
    })

    if (error && error.code !== "42P01") {
      console.error("No se pudo registrar audit log:", error.message)
    }
  } catch (error) {
    // Do not block the main workflow if audit logging fails.
    console.error("Error inesperado creando audit log:", error)
  }
}

