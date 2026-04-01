"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import useSWR from "swr"
import { CalendarClock, Loader2, Pencil, Save, Trash2, Upload, X } from "lucide-react"
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

type NotificationItem = {
  id: string
  title: string
  category: string
  description: string
  image_url: string | null
  schedule_type: "immediate" | "once" | "daily" | "monthly" | "yearly"
  scheduled_at: string | null
  schedule_day: number | null
  schedule_month: number | null
  schedule_year: number | null
  is_active: boolean
  created_at: string
  admin_users?: { full_name?: string; email?: string } | null
}

type NotificationForm = {
  title: string
  category: string
  description: string
  image_url: string
  schedule_type: "immediate" | "once" | "daily" | "monthly" | "yearly"
  scheduled_at: string
  schedule_day: string
  schedule_month: string
  schedule_year: string
  is_active: boolean
  comment: string
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la informacion.")
  }
  return data
}

const emptyForm: NotificationForm = {
  title: "",
  category: "",
  description: "",
  image_url: "",
  schedule_type: "immediate",
  scheduled_at: "",
  schedule_day: "",
  schedule_month: "",
  schedule_year: "",
  is_active: true,
  comment: "",
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (item: number) => String(item).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function NotificationsPage() {
  const { data, isLoading, error, mutate } = useSWR<{ notifications: NotificationItem[] }>(
    "/api/notifications",
    fetcher,
    {
      refreshInterval: 20000,
    },
  )

  const notifications = useMemo(() => data?.notifications || [], [data?.notifications])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<NotificationForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFeedback(null)
  }

  const startEdit = (item: NotificationItem) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      category: item.category,
      description: item.description,
      image_url: item.image_url || "",
      schedule_type: item.schedule_type,
      scheduled_at: toDatetimeLocal(item.scheduled_at),
      schedule_day: item.schedule_day ? String(item.schedule_day) : "",
      schedule_month: item.schedule_month ? String(item.schedule_month) : "",
      schedule_year: item.schedule_year ? String(item.schedule_year) : "",
      is_active: item.is_active,
      comment: "",
    })
    setFeedback(null)
  }

  const onUploadImage = async (file: File) => {
    setUploading(true)
    setFeedback(null)
    try {
      const url = await uploadAdminFile(file, "notifications")
      setForm((current) => ({ ...current, image_url: url }))
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Error de conexion subiendo imagen.",
      })
    } finally {
      setUploading(false)
    }
  }

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      schedule_type: form.schedule_type,
      is_active: form.is_active,
      comment: form.comment.trim() || null,
    }

    if (form.schedule_type === "once" || form.schedule_type === "daily") {
      payload.scheduled_at = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null
      payload.schedule_day = null
      payload.schedule_month = null
      payload.schedule_year = null
    }

    if (form.schedule_type === "monthly") {
      payload.scheduled_at = null
      payload.schedule_day = form.schedule_day ? Number(form.schedule_day) : null
      payload.schedule_month = null
      payload.schedule_year = null
    }

    if (form.schedule_type === "yearly") {
      payload.scheduled_at = null
      payload.schedule_day = form.schedule_day ? Number(form.schedule_day) : null
      payload.schedule_month = form.schedule_month ? Number(form.schedule_month) : null
      payload.schedule_year = form.schedule_year ? Number(form.schedule_year) : null
    }

    if (form.schedule_type === "immediate") {
      payload.scheduled_at = null
      payload.schedule_day = null
      payload.schedule_month = null
      payload.schedule_year = null
    }

    return payload
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const endpoint = editingId ? `/api/notifications/${editingId}` : "/api/notifications"
      const method = editingId ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      const result = await response.json()

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo guardar la notificacion.",
        })
        return
      }

      setFeedback({
        type: "ok",
        message: editingId
          ? "Notificacion actualizada correctamente."
          : "Notificacion creada correctamente.",
      })
      setEditingId(null)
      setForm(emptyForm)
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexion." })
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Eliminar esta notificacion?")
    if (!confirmed) return
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "DELETE" })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo eliminar la notificacion.",
        })
        return
      }
      setFeedback({ type: "ok", message: "Notificacion eliminada." })
      await mutate()
      if (editingId === id) {
        setEditingId(null)
        setForm(emptyForm)
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexion." })
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificaciones</h1>
            <p className="text-sm text-muted-foreground">
              Crea notificaciones con imagen, categoria, descripcion y programacion por fecha.
            </p>
          </div>
          <Button variant="outline" onClick={startCreate}>
            <CalendarClock className="mr-2 h-4 w-4" />
            Nueva notificacion
          </Button>
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
            <CardTitle>{editingId ? "Editar notificacion" : "Crear notificacion"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-3 lg:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label htmlFor="title">Titulo</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="Promocion, informativa, recordatorio..."
                  required
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="description">Descripcion</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label>Imagen (opcional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onUploadImage(file)
                  }}
                />
                {uploading && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
                {form.image_url && (
                  <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-secondary">
                    <Image
                      src={form.image_url}
                      alt="Vista previa de notificacion"
                      fill
                      className="object-cover"
                      sizes="100vw"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label>Tipo de programacion</Label>
                <Select
                  value={form.schedule_type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      schedule_type: value as NotificationForm["schedule_type"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Inmediata</SelectItem>
                    <SelectItem value="once">Una sola vez</SelectItem>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(form.schedule_type === "once" || form.schedule_type === "daily") && (
                <div className="space-y-1">
                  <Label htmlFor="scheduled-at">
                    {form.schedule_type === "once"
                      ? "Fecha y hora programada"
                      : "Inicio de programacion"}
                  </Label>
                  <Input
                    id="scheduled-at"
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, scheduled_at: event.target.value }))
                    }
                  />
                </div>
              )}

              {form.schedule_type === "monthly" && (
                <div className="space-y-1">
                  <Label htmlFor="monthly-day">Dia del mes (1-31)</Label>
                  <Input
                    id="monthly-day"
                    type="number"
                    min={1}
                    max={31}
                    value={form.schedule_day}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, schedule_day: event.target.value }))
                    }
                  />
                </div>
              )}

              {form.schedule_type === "yearly" && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="yearly-day">Dia</Label>
                    <Input
                      id="yearly-day"
                      type="number"
                      min={1}
                      max={31}
                      value={form.schedule_day}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, schedule_day: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="yearly-month">Mes</Label>
                    <Input
                      id="yearly-month"
                      type="number"
                      min={1}
                      max={12}
                      value={form.schedule_month}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, schedule_month: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="yearly-year">Ano (opcional)</Label>
                    <Input
                      id="yearly-year"
                      type="number"
                      min={new Date().getFullYear()}
                      value={form.schedule_year}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, schedule_year: event.target.value }))
                      }
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3 lg:col-span-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificacion activa</p>
                  <p className="text-xs text-muted-foreground">
                    Solo las notificaciones activas se entregan a los clientes.
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(value) =>
                    setForm((current) => ({ ...current, is_active: value }))
                  }
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="comment">Comentario de cambios</Label>
                <Textarea
                  id="comment"
                  value={form.comment}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, comment: event.target.value }))
                  }
                  placeholder="Contexto para historial de edicion"
                />
              </div>

              <div className="flex gap-2 lg:col-span-2">
                <Button
                  type="submit"
                  disabled={
                    saving ||
                    uploading ||
                    !form.title.trim() ||
                    !form.category.trim() ||
                    !form.description.trim()
                  }
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : editingId ? (
                    <Save className="mr-2 h-4 w-4" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {editingId ? "Guardar cambios" : "Crear notificacion"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={startCreate}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar edicion
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de notificaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error.message}</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay notificaciones registradas.</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center"
                >
                  <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-lg bg-secondary lg:w-40">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Programacion:{" "}
                      {item.schedule_type === "immediate"
                        ? "Inmediata"
                        : item.schedule_type === "once"
                          ? `Una vez (${item.scheduled_at ? new Date(item.scheduled_at).toLocaleString("es-CO") : "sin fecha"})`
                          : item.schedule_type === "daily"
                            ? `Diaria (desde ${item.scheduled_at ? new Date(item.scheduled_at).toLocaleDateString("es-CO") : "hoy"})`
                            : item.schedule_type === "monthly"
                              ? `Mensual (dia ${item.schedule_day || "-"})`
                              : `Anual (${item.schedule_day || "-"} / ${item.schedule_month || "-"}${item.schedule_year ? ` / ${item.schedule_year}` : ""})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estado: {item.is_active ? "Activa" : "Inactiva"} | Creada por{" "}
                      {item.admin_users?.full_name || "Sistema"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(item)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(item.id)}
                    >
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



