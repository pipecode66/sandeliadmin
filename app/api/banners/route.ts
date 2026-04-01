import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createAuditLog } from "@/lib/audit-log"
import { NextResponse } from "next/server"

const WHATSAPP_URL = "https://wa.me/3112120708"

function normalizeButtonType(value: unknown) {
  if (value === "whatsapp") return "whatsapp" as const
  return "url" as const
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const includeAll = searchParams.get("all") === "true"
  const supabase = createAdminClient()

  let query = supabase.from("banners").select("*").order("sort_order")

  if (includeAll) {
    const admin = await requireAdmin("supervisor")
    if (!admin.ok) return admin.response
  } else {
    query = query.eq("is_active", true)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()
  const banners = (data || []).filter((banner) => {
    if (includeAll) return true
    const start = banner.start_at ? new Date(String(banner.start_at)).getTime() : null
    const end = banner.end_at ? new Date(String(banner.end_at)).getTime() : null
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  })

  return NextResponse.json({ banners })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const buttonType = normalizeButtonType(body.button_type ?? body.redirect_type)
  const redirectUrl =
    buttonType === "whatsapp" ? WHATSAPP_URL : (body.redirect_url || null)

  const payload = {
    media_url: body.media_url,
    media_type: body.media_type,
    redirect_type: "url" as const,
    button_type: buttonType,
    redirect_url: redirectUrl,
    is_active: body.is_active ?? true,
    sort_order: body.sort_order ?? 0,
    start_at: body.start_at || null,
    end_at: body.end_at || null,
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from("banners").insert(payload).select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "banner",
    entityId: data.id,
    action: "create",
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ banner: data }, { status: 201 })
}
