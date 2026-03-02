import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { id } = await params
  const body = await request.json()
  const supabase = createAdminClient()
  const payload: Record<string, unknown> = {}

  if (body.media_url !== undefined) payload.media_url = body.media_url
  if (body.media_type !== undefined) payload.media_type = body.media_type
  if (body.redirect_url !== undefined) payload.redirect_url = body.redirect_url || null
  if (body.is_active !== undefined) payload.is_active = body.is_active
  if (body.sort_order !== undefined) payload.sort_order = body.sort_order
  payload.redirect_type = "url"

  const { data, error } = await supabase
    .from("banners")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ banner: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase.from("banners").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
