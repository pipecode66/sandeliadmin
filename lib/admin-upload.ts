"use client"

import { createClient } from "@/lib/supabase/client"

type PreparedUpload = {
  path: string
  token: string
  url: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "No se pudo subir el archivo."
}

export async function uploadAdminFile(file: File, folder: string) {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error("El archivo no puede superar los 25MB.")
  }

  const prepareResponse = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folder,
      fileName: file.name,
      contentType: file.type,
    }),
  })

  const prepared = (await prepareResponse.json()) as Partial<PreparedUpload> & { error?: string }
  if (!prepareResponse.ok || !prepared.path || !prepared.token || !prepared.url) {
    throw new Error(prepared.error || "No se pudo preparar la subida del archivo.")
  }

  const supabase = createClient()
  const { error } = await supabase.storage
    .from("media")
    .uploadToSignedUrl(prepared.path, prepared.token, file, {
      cacheControl: "3600",
    })

  if (error) {
    throw new Error(getErrorMessage(error))
  }

  return prepared.url
}
