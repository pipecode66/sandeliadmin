"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Pencil, Trash2, Upload } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type Banner = {
  id: string
  media_url: string
  media_type: "image" | "video"
  redirect_type: "url"
  redirect_url: string | null
  is_active: boolean
  sort_order: number
}

export default function BannersPage() {
  const { data, mutate } = useSWR<{ banners: Banner[] }>("/api/banners?all=true", fetcher, {
    refreshInterval: 20000,
  })
  const banners = data?.banners || []

  const [editing, setEditing] = useState<Banner | null>(null)
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video">("image")
  const [redirectUrl, setRedirectUrl] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState("0")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const resetForm = () => {
    setEditing(null)
    setMediaUrl("")
    setMediaType("image")
    setRedirectUrl("")
    setIsActive(true)
    setSortOrder("0")
    setError("")
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setError("")
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("folder", "banners")
      const response = await fetch("/api/upload", { method: "POST", body })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "No se pudo subir el archivo.")
        return
      }
      setMediaUrl(result.url)
      setMediaType(file.type.startsWith("video/") ? "video" : "image")
    } catch {
      setError("Error de conexion subiendo archivo.")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    const payload = {
      media_url: mediaUrl,
      media_type: mediaType,
      redirect_type: "url" as const,
      redirect_url: redirectUrl.trim() || null,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
    }

    try {
      const endpoint = editing ? `/api/banners/${editing.id}` : "/api/banners"
      const method = editing ? "PATCH" : "POST"
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "No se pudo guardar el banner.")
        return
      }
      resetForm()
      mutate()
    } catch {
      setError("Error de conexion.")
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (banner: Banner) => {
    setEditing(banner)
    setMediaUrl(banner.media_url)
    setMediaType(banner.media_type)
    setRedirectUrl(banner.redirect_url || "")
    setIsActive(banner.is_active)
    setSortOrder(String(banner.sort_order || 0))
    setError("")
  }

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Eliminar este banner?")
    if (!confirmed) return
    const response = await fetch(`/api/banners/${id}`, { method: "DELETE" })
    if (response.ok) mutate()
  }

  const onToggleActive = async (banner: Banner, value: boolean) => {
    const response = await fetch(`/api/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value }),
    })
    if (response.ok) mutate()
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona banners publicitarios (imagen/video maximo 25MB) para la app.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar Banner" : "Nuevo Banner"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2 lg:col-span-2">
                <Label>Archivo (imagen/video)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUpload(file)
                  }}
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground">Subiendo archivo...</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL de destino</Label>
                <Input
                  id="url"
                  value={redirectUrl}
                  onChange={(event) => setRedirectUrl(event.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Orden</Label>
                <Input
                  id="order"
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  min={0}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label htmlFor="active">Activo</Label>
                <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
              </div>

              {mediaUrl && (
                <div className="rounded-lg border p-3 lg:col-span-2">
                  <p className="mb-2 text-xs text-muted-foreground">Vista previa</p>
                  {mediaType === "image" ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg bg-secondary">
                      <Image src={mediaUrl} alt="Banner" fill className="object-cover" sizes="100vw" />
                    </div>
                  ) : (
                    <video
                      src={mediaUrl}
                      controls
                      className="h-40 w-full rounded-lg bg-secondary object-contain"
                    />
                  )}
                </div>
              )}

              {error && <p className="text-sm text-destructive lg:col-span-2">{error}</p>}

              <div className="flex gap-2 lg:col-span-2">
                <Button type="submit" disabled={saving || uploading || !mediaUrl}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {editing ? "Guardar Banner" : "Crear Banner"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Banners</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {banners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin banners registrados.</p>
            ) : (
              banners.map((banner) => (
                <div
                  key={banner.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center"
                >
                  <div className="relative h-20 w-28 overflow-hidden rounded-md bg-secondary">
                    {banner.media_type === "image" ? (
                      <Image
                        src={banner.media_url}
                        alt="Banner"
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <video src={banner.media_url} className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {banner.media_type === "image" ? "Imagen" : "Video"} · Orden {banner.sort_order}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Redireccion: {banner.redirect_url || "Sin URL"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={(value) => onToggleActive(banner, value)}
                    />
                    <Button variant="outline" size="sm" onClick={() => onEdit(banner)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(banner.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
