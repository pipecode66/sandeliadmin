import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAuditLog } from "@/lib/audit-log"
import { NextResponse } from "next/server"

const WHATSAPP_URL = "https://wa.me/3112120708"

function normalizeButtonType(value: unknown) {
  if (value === "whatsapp") return "whatsapp" as const
  return "url" as const
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()

  const { data: current } = await supabase.from("banners").select("*").eq("id", id).maybeSingle()

  const payload: Record<string, unknown> = {}
  if (body.media_url !== undefined) payload.media_url = body.media_url
  if (body.media_type !== undefined) payload.media_type = body.media_type
  if (body.is_active !== undefined) payload.is_active = body.is_active
  if (body.sort_order !== undefined) payload.sort_order = body.sort_order
  if (body.start_at !== undefined) payload.start_at = body.start_at || null
  if (body.end_at !== undefined) payload.end_at = body.end_at || null

  if (body.button_type !== undefined || body.redirect_type !== undefined) {
    const buttonType = normalizeButtonType(body.button_type ?? body.redirect_type)
    payload.button_type = buttonType
    payload.redirect_type = "url"
    payload.redirect_url = buttonType === "whatsapp" ? WHATSAPP_URL : (body.redirect_url || null)
  } else if (body.redirect_url !== undefined) {
    payload.redirect_url = body.redirect_url || null
  }

  const { data, error } = await supabase
    .from("banners")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "banner",
    entityId: id,
    action: "update",
    beforeData: current || null,
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ banner: data })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { data: current } = await supabase.from("banners").select("*").eq("id", id).maybeSingle()
  const { error } = await supabase.from("banners").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "banner",
    entityId: id,
    action: "delete",
    beforeData: current || null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true })
}

