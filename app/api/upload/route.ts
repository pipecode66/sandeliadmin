import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function getSafeExtension(fileName?: string | null, contentType?: string | null) {
  const fromName = String(fileName || "").split(".").pop()?.toLowerCase() || ""
  if (/^[a-z0-9]+$/i.test(fromName)) return fromName

  const fromType = String(contentType || "").split("/").pop()?.toLowerCase() || ""
  if (/^[a-z0-9]+$/i.test(fromType)) return fromType

  return "bin"
}

function buildStoragePath(folder: string, fileName?: string | null, contentType?: string | null) {
  const safeFolder = String(folder || "general")
    .trim()
    .replace(/[^a-z0-9/_-]/gi, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "") || "general"

  const extension = getSafeExtension(fileName, contentType)
  return `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const requestType = request.headers.get("content-type") || ""

  if (requestType.includes("application/json")) {
    const body = await request.json()
    const folder = String(body.folder || "general")
    const fileName = typeof body.fileName === "string" ? body.fileName : null
    const contentType = typeof body.contentType === "string" ? body.contentType : null
    const path = buildStoragePath(folder, fileName, contentType)

    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUploadUrl(path)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "No se pudo preparar la subida." }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path)

    return NextResponse.json({
      path,
      token: data.token,
      url: urlData.publicUrl,
    })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const folder = (formData.get("folder") as string) || "general"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar los 25MB." }, { status: 400 })
  }

  const fileName = buildStoragePath(folder, file.name, file.type)
  const { data, error } = await supabase.storage.from("media").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from("media").getPublicUrl(data.path)
  return NextResponse.json({ url: urlData.publicUrl })
}
