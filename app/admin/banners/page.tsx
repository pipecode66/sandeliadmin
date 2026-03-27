"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import useSWR from "swr"
import { Loader2, Pencil, Trash2, Upload } from "lucide-react"
import { uploadAdminFile } from "@/lib/admin-upload"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type Banner = {
  id: string
  media_url: string
  media_type: "image" | "video"
  redirect_type: "url"
  button_type?: "url" | "whatsapp"
  redirect_url: string | null
  is_active: boolean
  sort_order: number
  start_at: string | null
  end_at: string | null
}

type BannerForm = {
  mediaUrl: string
  mediaType: "image" | "video"
  buttonType: "url" | "whatsapp"
  redirectUrl: string
  isActive: boolean
  sortOrder: string
  startAt: string
  endAt: string
  comment: string
}

const WHATSAPP_URL = "https://wa.me/3112120708"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la informaciÃ³n.")
  }
  return data
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (item: number) => String(item).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const emptyForm: BannerForm = {
  mediaUrl: "",
  mediaType: "image",
  buttonType: "url",
  redirectUrl: "",
  isActive: true,
  sortOrder: "0",
  startAt: "",
  endAt: "",
  comment: "",
}

export default function BannersPage() {
  const { data, mutate, isLoading, error } = useSWR<{ banners: Banner[] }>(
    "/api/banners?all=true",
    fetcher,
    {
      refreshInterval: 20000,
    },
  )
  const banners = useMemo(() => data?.banners || [], [data?.banners])

  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerForm>(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const resetForm = () => {
    setEditing(null)
    setForm(emptyForm)
    setFeedback(null)
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setFeedback(null)
    try {
      const url = await uploadAdminFile(file, "banners")
      setForm((current) => ({
        ...current,
        mediaUrl: url,
        mediaType: file.type.startsWith("video/") ? "video" : "image",
      }))
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Error de conexión subiendo archivo.",
      })
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)

    const payload = {
      media_url: form.mediaUrl,
      media_type: form.mediaType,
      button_type: form.buttonType,
      redirect_url:
        form.buttonType === "whatsapp" ? WHATSAPP_URL : form.redirectUrl.trim() || null,
      is_active: form.isActive,
      sort_order: Number(form.sortOrder) || 0,
      start_at: form.startAt ? new Date(form.startAt).toISOString() : null,
      end_at: form.endAt ? new Date(form.endAt).toISOString() : null,
      comment: form.comment.trim() || null,
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
        setFeedback({ type: "error", message: result.error || "No se pudo guardar el banner." })
        return
      }

      resetForm()
      setFeedback({
        type: "ok",
        message: editing ? "Banner actualizado correctamente." : "Banner creado correctamente.",
      })
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexiÃ³n." })
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (banner: Banner) => {
    setEditing(banner)
    setForm({
      mediaUrl: banner.media_url,
      mediaType: banner.media_type,
      buttonType: banner.button_type || "url",
      redirectUrl:
        banner.button_type === "whatsapp" ? "" : (banner.redirect_url || ""),
      isActive: banner.is_active,
      sortOrder: String(banner.sort_order || 0),
      startAt: toDatetimeLocal(banner.start_at),
      endAt: toDatetimeLocal(banner.end_at),
      comment: "",
    })
    setFeedback(null)
  }

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Â¿Eliminar este banner?")
    if (!confirmed) return

    try {
      const response = await fetch(`/api/banners/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo eliminar el banner.",
        })
        return
      }
      setFeedback({ type: "ok", message: "Banner eliminado." })
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexiÃ³n." })
    }
  }

  const onToggleActive = async (banner: Banner, value: boolean) => {
    const response = await fetch(`/api/banners/${banner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value }),
    })
    if (response.ok) mutate()
  }

  const now = Date.now()

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona banners publicitarios con programaciÃ³n y botÃ³n de WhatsApp.
          </p>
        </div>

        {feedback && (
          <Card
            className={
              feedback.type === "ok"
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }
          >
            <CardContent
              className={feedback.type === "ok" ? "py-3 text-sm text-emerald-700" : "py-3 text-sm text-red-700"}
            >
              {feedback.message}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar banner" : "Nuevo banner"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2 lg:col-span-2">
                <Label>Archivo (imagen o video, mÃ¡ximo 25 MB)</Label>
                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUpload(file)
                  }}
                />
                {uploading && <p className="text-sm text-muted-foreground">Subiendo archivo...</p>}
              </div>

              <div className="space-y-2">
                <Label>Tipo de botÃ³n</Label>
                <Select
                  value={form.buttonType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      buttonType: value as "url" | "whatsapp",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">Abrir URL</SelectItem>
                    <SelectItem value="whatsapp">Abrir WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Orden</Label>
                <Input
                  id="order"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                />
              </div>

              {form.buttonType === "url" ? (
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="url">URL de destino</Label>
                  <Input
                    id="url"
                    value={form.redirectUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, redirectUrl: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary lg:col-span-2">
                  Este banner abrirÃ¡ directamente el chat de WhatsApp: <strong>3112120708</strong>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="start-at">Inicio de publicaciÃ³n</Label>
                <Input
                  id="start-at"
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-at">Fin de publicaciÃ³n</Label>
                <Input
                  id="end-at"
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 lg:col-span-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Banner activo</p>
                  <p className="text-xs text-muted-foreground">
                    Si estÃ¡ desactivado, no se muestra en la app.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, isActive: value }))
                  }
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="comment">Comentario de cambios</Label>
                <Textarea
                  id="comment"
                  value={form.comment}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, comment: event.target.value }))
                  }
                  placeholder="Contexto de creaciÃ³n o ediciÃ³n"
                />
              </div>

              {form.mediaUrl && (
                <div className="rounded-lg border p-3 lg:col-span-2">
                  <p className="mb-2 text-xs text-muted-foreground">Vista previa</p>
                  {form.mediaType === "image" ? (
                    <div className="relative h-44 w-full overflow-hidden rounded-lg bg-secondary">
                      <Image
                        src={form.mediaUrl}
                        alt="Vista previa banner"
                        fill
                        className="object-cover"
                        sizes="100vw"
                      />
                    </div>
                  ) : (
                    <video
                      src={form.mediaUrl}
                      controls
                      className="h-44 w-full rounded-lg bg-secondary object-contain"
                    />
                  )}
                </div>
              )}

              <div className="flex gap-2 lg:col-span-2">
                <Button type="submit" disabled={saving || uploading || !form.mediaUrl}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {editing ? "Guardar banner" : "Crear banner"}
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
            <CardTitle>Listado de banners</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando banners...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error.message}</p>
            ) : banners.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin banners registrados.</p>
            ) : (
              banners.map((banner) => {
                const start = banner.start_at ? new Date(banner.start_at).getTime() : null
                const end = banner.end_at ? new Date(banner.end_at).getTime() : null
                const isNowVisible =
                  banner.is_active &&
                  (!start || now >= start) &&
                  (!end || now <= end)

                return (
                  <div
                    key={banner.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center"
                  >
                    <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-md bg-secondary lg:w-44">
                      {banner.media_type === "image" ? (
                        <Image
                          src={banner.media_url}
                          alt="Banner"
                          fill
                          className="object-cover"
                          sizes="176px"
                        />
                      ) : (
                        <video src={banner.media_url} className="h-full w-full object-cover" />
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {banner.media_type === "image" ? "Imagen" : "Video"} Â· Orden {banner.sort_order}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        BotÃ³n: {banner.button_type === "whatsapp" ? "WhatsApp" : "URL"}
                        {" Â· "}
                        Destino:{" "}
                        {banner.button_type === "whatsapp"
                          ? WHATSAPP_URL
                          : banner.redirect_url || "Sin URL"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ProgramaciÃ³n:{" "}
                        {banner.start_at
                          ? `desde ${new Date(banner.start_at).toLocaleString("es-CO")}`
                          : "sin fecha de inicio"}
                        {banner.end_at
                          ? ` hasta ${new Date(banner.end_at).toLocaleString("es-CO")}`
                          : " y sin fecha de fin"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estado actual:{" "}
                        {isNowVisible ? "Visible ahora" : banner.is_active ? "Fuera de horario" : "Inactivo"}
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
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(banner.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}



