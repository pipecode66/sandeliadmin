import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const formData = await request.formData()
  const file = formData.get("file") as File
  const folder = formData.get("folder") as string || "general"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Check file size (25MB max)
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json(
      { error: "El archivo no puede superar los 25MB." },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()
  const fileExt = file.name.split(".").pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

  const { data, error } = await supabase.storage
    .from("media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from("media")
    .getPublicUrl(data.path)

  return NextResponse.json({ url: urlData.publicUrl })
}
