"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import useSWR from "swr"
import { CheckCircle2, Copy, Loader2, ShieldCheck, XCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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
  }[]
  redemptions: {
    id: string
    code: string
    points_spent: number
    status: "pending" | "validated" | "rejected"
    created_at: string
    validated_at: string | null
    products?: { name?: string | null; image_url?: string | null }
  }[]
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = params?.id
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const { data, isLoading, mutate } = useSWR<ClientPayload>(
    clientId ? `/api/clients/${clientId}` : null,
    fetcher,
    { refreshInterval: 15000 },
  )

  const pendingRedemptions = useMemo(
    () => (data?.redemptions || []).filter((item) => item.status === "pending"),
    [data?.redemptions],
  )

  const onValidateCode = async (selectedCode?: string) => {
    const currentCode = (selectedCode || code).trim().toUpperCase()
    if (!currentCode) return

    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/redemptions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: currentCode }),
      })
      const result = await response.json()

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo validar el codigo.",
        })
      } else {
        setFeedback({
          type: "ok",
          message: `Codigo validado. Se descontaron ${result.pointsDeducted} puntos.`,
        })
        setCode("")
        mutate()
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexion." })
    } finally {
      setLoading(false)
    }
  }

  const copyCode = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Silent fallback.
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Detalle de Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Validaci&oacute;n de c&oacute;digos, puntos e historial del cliente.
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Cargando informaci&oacute;n...
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Informaci&oacute;n General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Nombre</p>
                    <p className="text-sm font-medium text-foreground">{data.client.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Codigo cliente</p>
                    <p className="text-sm font-medium text-foreground">{data.client.user_code}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Correo</p>
                    <p className="text-sm text-foreground">{data.client.email}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Telefono</p>
                    <p className="text-sm text-foreground">{data.client.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Direccion</p>
                    <p className="text-sm text-foreground">{data.client.address}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Sexo</p>
                    <p className="text-sm text-foreground">{data.client.gender}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">Contrasena cliente</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="rounded-md bg-secondary px-2 py-1 font-mono text-sm text-foreground">
                        {data.client.password_set && data.client.password_plain
                          ? data.client.password_plain
                          : "Sin configurar"}
                      </p>
                      {data.client.password_set && data.client.password_plain && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyCode(data.client.password_plain || "")}
                        >
                          <Copy className="mr-1 h-3.5 w-3.5" />
                          Copiar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Puntos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs uppercase text-primary/80">Puntos disponibles</p>
                    <p className="text-2xl font-bold text-primary">{data.client.points}</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-xs uppercase text-muted-foreground">Canjeado hoy</p>
                    <p className="text-xl font-semibold text-foreground">
                      {data.client.redeemed_today} / 60
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Limite diario: maximo 60 puntos validados.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Validar Codigo de Redencion
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1">
                    <Label htmlFor="code">Codigo</Label>
                    <Input
                      id="code"
                      value={code}
                      onChange={(event) => setCode(event.target.value.toUpperCase())}
                      placeholder="Ej: AB12CD34"
                      maxLength={8}
                    />
                  </div>
                  <div className="sm:self-end">
                    <Button onClick={() => onValidateCode()} disabled={loading || !code.trim()}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Validar Codigo
                    </Button>
                  </div>
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
                      No hay codigos pendientes para este cliente.
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
                              Codigo: {item.code} · {item.points_spent} pts
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
                              disabled={loading}
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
                  <CardTitle>Historial de Facturas</CardTitle>
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
                          {invoice.amount.toLocaleString("es-CO")}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-primary">
                          +{invoice.points_earned} pts
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Historial de Redenciones</CardTitle>
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
                              Validado
                            </span>
                          ) : redemption.status === "pending" ? (
                            <span className="text-xs font-medium text-amber-700">Pendiente</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                              Rechazado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Codigo {redemption.code} · {redemption.points_spent} pts
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  )
}
