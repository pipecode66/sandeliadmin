"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import useSWR from "swr"
import {
  CheckCircle2,
  Copy,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la información.")
  }
  return data
}

type ClientPayload = {
  client: {
    id: string
    full_name: string
    email: string
    phone: string
    address: string
    gender: string
    points: number
    redeemed_today: number
    last_redeem_date: string | null
    daily_limit_override?: boolean
    user_code: string
    password_plain: string | null
    password_set: boolean
    created_at: string
  }
  invoices: {
    id: string
    invoice_number: string
    amount: number
    points_earned: number
    created_at: string
    issued_by?: { full_name?: string; email?: string; role?: string }
  }[]
  redemptions: {
    id: string
    code: string
    points_spent: number
    status: "pending" | "validated" | "rejected"
    created_at: string
    validated_at: string | null
    products?: { name?: string | null; image_url?: string | null }
    validated_by?: { full_name?: string; email?: string; role?: string }
  }[]
}

type AuditLog = {
  id: string
  action: string
  comment: string | null
  before_data: unknown
  after_data: unknown
  created_at: string
  admin_users?: { full_name?: string; email?: string; role?: string }
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id

  const [code, setCode] = useState("")
  const [validateComment, setValidateComment] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPoints, setSavingPoints] = useState(false)
  const [loadingValidate, setLoadingValidate] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const [profileComment, setProfileComment] = useState("")
  const [pointsComment, setPointsComment] = useState("")
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    gender: "Femenino",
    password_plain: "",
    daily_limit_override: false,
  })
  const [pointsForm, setPointsForm] = useState({
    points: "0",
    redeemed_today: "0",
    daily_limit_override: false,
  })

  const { data, isLoading, mutate } = useSWR<ClientPayload>(
    clientId ? `/api/clients/${clientId}` : null,
    fetcher,
    { refreshInterval: 15000 },
  )

  const { data: auditData, mutate: mutateAudit } = useSWR<{ logs: AuditLog[] }>(
    clientId ? `/api/audit-log?entity_type=client&entity_id=${clientId}&limit=40` : null,
    fetcher,
    { refreshInterval: 20000 },
  )

  useEffect(() => {
    if (!data?.client) return
    setProfileForm({
      full_name: data.client.full_name || "",
      email: data.client.email || "",
      phone: data.client.phone || "",
      address: data.client.address || "",
      gender: data.client.gender || "Femenino",
      password_plain: data.client.password_plain || "",
      daily_limit_override: Boolean(data.client.daily_limit_override),
    })
    setPointsForm({
      points: String(data.client.points || 0),
      redeemed_today: String(data.client.redeemed_today || 0),
      daily_limit_override: Boolean(data.client.daily_limit_override),
    })
  }, [data?.client])

  const pendingRedemptions = useMemo(
    () => (data?.redemptions || []).filter((item) => item.status === "pending"),
    [data?.redemptions],
  )

  const onValidateCode = async (selectedCode?: string) => {
    const currentCode = (selectedCode || code).trim().toUpperCase()
    if (!currentCode) return

    setLoadingValidate(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/redemptions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentCode, comment: validateComment }),
      })
      const result = await response.json()

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo validar el código.",
        })
      } else {
        setFeedback({
          type: "ok",
          message: `Código validado. Se descontaron ${result.pointsDeducted} puntos.`,
        })
        setCode("")
        setValidateComment("")
        await Promise.all([mutate(), mutateAudit()])
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setLoadingValidate(false)
    }
  }

  const onSaveProfile = async () => {
    if (!clientId) return
    setSavingProfile(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profileForm,
          comment: profileComment,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({ type: "error", message: result.error || "No se pudo guardar." })
        return
      }
      setProfileComment("")
      setFeedback({ type: "ok", message: "Información del cliente actualizada." })
      await Promise.all([mutate(), mutateAudit()])
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setSavingProfile(false)
    }
  }

  const onSavePoints = async () => {
    if (!clientId) return
    setSavingPoints(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/clients/${clientId}/points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: Number(pointsForm.points || 0),
          redeemed_today: Number(pointsForm.redeemed_today || 0),
          daily_limit_override: pointsForm.daily_limit_override,
          comment: pointsComment,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudieron actualizar los puntos.",
        })
        return
      }
      setPointsComment("")
      setFeedback({ type: "ok", message: "Puntos y límite diario actualizados." })
      await Promise.all([mutate(), mutateAudit()])
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setSavingPoints(false)
    }
  }

  const onResetDailyLimit = async () => {
    if (!clientId) return
    setSavingPoints(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/points`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reset_daily_limit: true,
          comment: pointsComment || "Reinicio manual del límite diario.",
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo reiniciar el límite.",
        })
        return
      }
      setFeedback({ type: "ok", message: "Límite diario reiniciado correctamente." })
      await Promise.all([mutate(), mutateAudit()])
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setSavingPoints(false)
    }
  }

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // No bloquea el flujo si el navegador no permite copiar.
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Detalle de cliente</h1>
          <p className="text-sm text-muted-foreground">
            Edita información general, contraseña, puntos, límites y trazabilidad completa.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Cargando información...
            </CardContent>
          </Card>
        ) : !data?.client ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Cliente no encontrado.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Información general</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Nombre completo</Label>
                      <Input
                        value={profileForm.full_name}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            full_name: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Código cliente</Label>
                      <Input value={data.client.user_code} disabled />
                    </div>

                    <div className="space-y-1">
                      <Label>Correo</Label>
                      <Input
                        value={profileForm.email}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Teléfono</Label>
                      <Input
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, phone: event.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Dirección</Label>
                      <Input
                        value={profileForm.address}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Sexo</Label>
                      <Input
                        value={profileForm.gender}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            gender: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Contraseña del cliente</Label>
                    <Input
                      value={profileForm.password_plain}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...current,
                          password_plain: event.target.value,
                        }))
                      }
                      placeholder="Déjala vacía para limpiar la contraseña"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Exceder límite diario</p>
                      <p className="text-xs text-muted-foreground">
                        Si está activo, el cliente puede canjear por encima del límite diario.
                      </p>
                    </div>
                    <Switch
                      checked={profileForm.daily_limit_override}
                      onCheckedChange={(value) =>
                        setProfileForm((current) => ({
                          ...current,
                          daily_limit_override: value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Comentario de edición</Label>
                    <Textarea
                      value={profileComment}
                      onChange={(event) => setProfileComment(event.target.value)}
                      placeholder="Motivo de la modificación"
                    />
                  </div>

                  <Button onClick={onSaveProfile} disabled={savingProfile}>
                    {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar información
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Puntos y límite diario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Puntos disponibles</Label>
                      <Input
                        type="number"
                        value={pointsForm.points}
                        onChange={(event) =>
                          setPointsForm((current) => ({
                            ...current,
                            points: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Canjeado hoy</Label>
                      <Input
                        type="number"
                        value={pointsForm.redeemed_today}
                        onChange={(event) =>
                          setPointsForm((current) => ({
                            ...current,
                            redeemed_today: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Override de límite
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Permite exceder el límite de canje para este cliente.
                      </p>
                    </div>
                    <Switch
                      checked={pointsForm.daily_limit_override}
                      onCheckedChange={(value) =>
                        setPointsForm((current) => ({
                          ...current,
                          daily_limit_override: value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Comentario de puntos</Label>
                    <Textarea
                      value={pointsComment}
                      onChange={(event) => setPointsComment(event.target.value)}
                      placeholder="Explica por qué modificas puntos o límite"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={onSavePoints} disabled={savingPoints}>
                      {savingPoints && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar puntos
                    </Button>
                    <Button variant="outline" onClick={onResetDailyLimit} disabled={savingPoints}>
                      Reiniciar límite diario
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Validar redención
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Label htmlFor="code">Código</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      placeholder="Ejemplo: AB12CD34"
                      maxLength={8}
                    />
                  </div>
                  <div className="sm:self-end">
                    <Button
                      onClick={() => onValidateCode()}
                      disabled={loadingValidate || !code.trim()}
                    >
                      {loadingValidate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Validar código
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Comentario de validación</Label>
                  <Textarea
                    value={validateComment}
                    onChange={(event) => setValidateComment(event.target.value)}
                    placeholder="Detalle de la validación"
                  />
                </div>

                {feedback && (
                  <div
                    className={`rounded-lg border p-3 text-sm ${
                      feedback.type === "ok"
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-red-300 bg-red-50 text-red-700"
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}

                <Separator />

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Pendientes por validar ({pendingRedemptions.length})
                  </p>
                  {pendingRedemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No hay códigos pendientes para este cliente.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pendingRedemptions.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {item.products?.name || "Producto"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Código: {item.code} · {item.points_spent} pts
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyCode(item.code)}
                            >
                              <Copy className="mr-1 h-3.5 w-3.5" />
                              Copiar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={loadingValidate}
                              onClick={() => onValidateCode(item.code)}
                            >
                              Validar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Historial de facturas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.invoices.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin facturas registradas.</p>
                  ) : (
                    data.invoices.map((invoice) => (
                      <div key={invoice.id} className="rounded-lg border p-3">
                        <p className="text-sm font-medium text-foreground">
                          Factura #{invoice.invoice_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(invoice.created_at).toLocaleDateString("es-CO")} · $
                          {invoice.amount.toLocaleString("es-CO")} · +{invoice.points_earned} pts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Emitida por: {invoice.issued_by?.full_name || "Sin registro"}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Historial de redenciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.redemptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin redenciones registradas.</p>
                  ) : (
                    data.redemptions.map((redemption) => (
                      <div key={redemption.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            {redemption.products?.name || "Producto"}
                          </p>
                          {redemption.status === "validated" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Validada
                            </span>
                          ) : redemption.status === "pending" ? (
                            <span className="text-xs font-medium text-amber-700">Pendiente</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Rechazada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Código {redemption.code} · {redemption.points_spent} pts
                        </p>
                        {redemption.status === "validated" && (
                          <p className="text-xs text-muted-foreground">
                            Validada por: {redemption.validated_by?.full_name || "Sin registro"}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Historial de edición</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(auditData?.logs || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin cambios auditados para este cliente.
                  </p>
                ) : (
                  auditData!.logs.map((log) => (
                    <div key={log.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("es-CO")} ·{" "}
                        {log.admin_users?.full_name || "Sistema"}
                      </p>
                      {log.comment && (
                        <p className="mt-1 rounded bg-secondary px-2 py-1 text-xs text-foreground">
                          Comentario: {log.comment}
                        </p>
                      )}
                      <details className="mt-2 text-xs text-muted-foreground">
                        <summary>Ver detalle de cambios</summary>
                        <pre className="mt-2 overflow-x-auto rounded bg-secondary p-2">
                          {JSON.stringify(
                            {
                              before: log.before_data,
                              after: log.after_data,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminShell>
  )
}
