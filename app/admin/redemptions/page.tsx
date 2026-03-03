"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { CheckCircle2, Loader2, Search, ShieldCheck, XCircle } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Redemption = {
  id: string
  code: string
  points_spent: number
  status: "pending" | "validated" | "rejected"
  created_at: string
  validated_at: string | null
  clients?: { full_name?: string } | null
  products?: { name?: string; image_url?: string } | null
  validated_by?: { full_name?: string; email?: string; role?: string } | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la información.")
  }
  return data
}

export default function RedemptionsPage() {
  const [search, setSearch] = useState("")
  const [code, setCode] = useState("")
  const [comment, setComment] = useState("")
  const [validating, setValidating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null)

  const { data, isLoading, error, mutate } = useSWR<{ redemptions: Redemption[] }>(
    "/api/redemptions",
    fetcher,
    {
      refreshInterval: 15000,
    },
  )

  const redemptions = useMemo(() => data?.redemptions || [], [data?.redemptions])
  const filteredRedemptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return redemptions
    return redemptions.filter((item) => {
      const productName = item.products?.name?.toLowerCase() || ""
      const clientName = item.clients?.full_name?.toLowerCase() || ""
      const codeValue = item.code?.toLowerCase() || ""
      return (
        productName.includes(query) || clientName.includes(query) || codeValue.includes(query)
      )
    })
  }, [redemptions, search])

  const pendingCount = filteredRedemptions.filter((item) => item.status === "pending").length

  const onValidate = async (inputCode?: string) => {
    const selectedCode = (inputCode || code).trim().toUpperCase()
    if (!selectedCode) return

    setValidating(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/redemptions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedCode,
          comment,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({ type: "error", message: result.error || "No se pudo validar el código." })
        return
      }

      setFeedback({
        type: "ok",
        message: `Código validado. Se descontaron ${result.pointsDeducted} puntos.`,
      })
      setCode("")
      setComment("")
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setValidating(false)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Redenciones</h1>
          <p className="text-sm text-muted-foreground">
            Revisa historial de canjes y valida códigos pendientes con trazabilidad de usuario.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Validar código de redención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="Ej: AB12CD34"
                  maxLength={8}
                />
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="comment">Comentario de validación</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Motivo o detalle del canje"
                />
              </div>
            </div>

            <Button onClick={() => onValidate()} disabled={validating || !code.trim()}>
              {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Validar código
            </Button>

            {feedback && (
              <div
                className={
                  feedback.type === "ok"
                    ? "rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700"
                    : "rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
                }
              >
                {feedback.message}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de redenciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Buscar por cliente, producto o código"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Pendientes en el resultado actual: <strong>{pendingCount}</strong>
            </p>

            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando redenciones...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error.message}</p>
            ) : filteredRedemptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay redenciones registradas.</p>
            ) : (
              filteredRedemptions.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 lg:flex-row lg:items-center"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {item.products?.name || "Producto"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cliente: {item.clients?.full_name || "Sin registro"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Código: {item.code} · {item.points_spent} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creada: {new Date(item.created_at).toLocaleString("es-CO")}
                    </p>
                    {item.status === "validated" && (
                      <p className="text-xs text-muted-foreground">
                        Validada por: {item.validated_by?.full_name || "Sin registro"}
                        {item.validated_at
                          ? ` · ${new Date(item.validated_at).toLocaleString("es-CO")}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === "validated" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Validada
                      </span>
                    ) : item.status === "pending" ? (
                      <>
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                          Pendiente
                        </span>
                        <Button
                          size="sm"
                          onClick={() => onValidate(item.code)}
                          disabled={validating}
                        >
                          Validar ahora
                        </Button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        <XCircle className="h-3.5 w-3.5" />
                        Rechazada
                      </span>
                    )}
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
