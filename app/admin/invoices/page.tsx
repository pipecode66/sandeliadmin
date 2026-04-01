"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2, Plus, RefreshCcw, Save } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Badge } from "@/components/ui/badge"
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

type Client = { id: string; full_name: string; email: string; phone: string }

type Invoice = {
  id: string
  client_id: string | null
  invoice_number: string
  amount: number
  points_earned: number
  created_at: string
  imported_at?: string | null
  source?: "manual" | "vectorpos" | null
  source_invoice_id?: string | null
  source_client_phone?: string | null
  source_client_name?: string | null
  match_status?: "matched" | "unmatched" | "duplicate" | null
  points_applied_at?: string | null
  clients?: { full_name?: string; email?: string; phone?: string } | null
  issued_by?: { full_name?: string; email?: string; role?: string } | null
}

type VectorPosState = {
  provider: string
  is_enabled: boolean
  start_from_invoice_id: number
  last_checked_invoice_id: number | null
  last_imported_invoice_id: number | null
  last_run_at: string | null
  last_error: string | null
  miss_streak: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la información.")
  }
  return data
}

function clientOptionLabel(client: Client) {
  return `${client.full_name} | ${client.phone} | ${client.email}`
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("es-CO")
}

function getInvoiceDisplayDate(invoice: Invoice) {
  return invoice.imported_at || invoice.created_at
}

export default function InvoicesPage() {
  const { data: clientsData } = useSWR<{ clients: Client[] }>("/api/clients", fetcher)
  const { data: invoicesData, mutate: mutateInvoices } = useSWR<{ invoices: Invoice[] }>(
    "/api/invoices",
    fetcher,
    {
      refreshInterval: 15000,
    },
  )
  const { data: vectorPosData, mutate: mutateVectorPos } = useSWR<{
    state: VectorPosState
    has_credentials: boolean
  }>("/api/invoices/vectorpos/status", fetcher, {
    refreshInterval: 15000,
  })

  const [clientId, setClientId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [savingVectorPos, setSavingVectorPos] = useState(false)
  const [syncingVectorPos, setSyncingVectorPos] = useState(false)
  const [assigningInvoiceId, setAssigningInvoiceId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )
  const [vectorPosEnabled, setVectorPosEnabled] = useState(false)
  const [startFromInvoiceId, setStartFromInvoiceId] = useState("0")
  const [assignInputs, setAssignInputs] = useState<Record<string, string>>({})
  const [assignComments, setAssignComments] = useState<Record<string, string>>({})

  const clients = useMemo(() => clientsData?.clients || [], [clientsData?.clients])
  const invoices = useMemo(() => invoicesData?.invoices || [], [invoicesData?.invoices])
  const unmatchedInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) => invoice.source === "vectorpos" && (!invoice.client_id || !invoice.points_applied_at),
      ),
    [invoices],
  )
  const calculatedPoints = Number(amount) >= 1000 ? Math.floor(Number(amount) / 1000) : 0
  const hasVectorPosCredentials = Boolean(vectorPosData?.has_credentials)

  useEffect(() => {
    if (!vectorPosData?.state) return
    setVectorPosEnabled(Boolean(vectorPosData.state.is_enabled))
    setStartFromInvoiceId(String(vectorPosData.state.start_from_invoice_id || 0))
  }, [vectorPosData?.state])

  const clientLabels = useMemo(() => {
    return new Map(clients.map((client) => [clientOptionLabel(client), client.id]))
  }, [clients])

  const onSubmitManualInvoice = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          invoice_number: invoiceNumber.trim(),
          amount: Number(amount),
          comment: comment.trim() || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo registrar la factura.",
        })
        return
      }

      setClientId("")
      setInvoiceNumber("")
      setAmount("")
      setComment("")
      setFeedback({ type: "ok", message: "Factura manual registrada correctamente." })
      await mutateInvoices()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setLoading(false)
    }
  }

  const onSaveVectorPosConfig = async () => {
    setSavingVectorPos(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/invoices/vectorpos/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_enabled: vectorPosEnabled,
          start_from_invoice_id: Number(startFromInvoiceId || 0),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo guardar la configuración de VectorPOS.",
        })
        return
      }

      setFeedback({ type: "ok", message: "Configuración de VectorPOS actualizada." })
      await mutateVectorPos()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setSavingVectorPos(false)
    }
  }

  const onSyncVectorPosNow = async () => {
    setSyncingVectorPos(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/invoices/vectorpos/sync", {
        method: "POST",
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo sincronizar VectorPOS.",
        })
        await mutateVectorPos()
        return
      }

      setFeedback({
        type: "ok",
        message: `Sincronización completada. Nuevas: ${result.summary.imported}, duplicadas: ${result.summary.duplicates}, sin asociar: ${result.summary.unmatched}.`,
      })
      await Promise.all([mutateInvoices(), mutateVectorPos()])
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setSyncingVectorPos(false)
    }
  }

  const onAssignClient = async (invoice: Invoice) => {
    const selectedLabel = assignInputs[invoice.id] || ""
    const selectedClientId = clientLabels.get(selectedLabel)

    if (!selectedClientId) {
      setFeedback({
        type: "error",
        message: "Selecciona un cliente valido de la lista para asociar la factura.",
      })
      return
    }

    setAssigningInvoiceId(invoice.id)
    setFeedback(null)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/assign-client`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          comment: assignComments[invoice.id] || null,
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo asociar la factura al cliente.",
        })
        return
      }

      setAssignInputs((current) => ({ ...current, [invoice.id]: "" }))
      setAssignComments((current) => ({ ...current, [invoice.id]: "" }))
      setFeedback({
        type: "ok",
        message: `Factura asociada correctamente. ${result.points_applied_now ? `Se aplicaron ${result.points_earned} puntos.` : "Los puntos ya estaban aplicados."}`,
      })
      await mutateInvoices()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setAssigningInvoiceId(null)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
          <p className="text-sm text-muted-foreground">
            Registra facturas manuales y sincroniza compras desde VectorPOS para sumar puntos automáticamente.
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
            <CardTitle>VectorPOS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {!hasVectorPosCredentials && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                Configura <code>VECTORPOS_API_USER</code> y <code>VECTORPOS_API_KEY</code> para activar la sincronización.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Estado</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {vectorPosData?.state.is_enabled ? "Activo" : "Inactivo"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Último ID revisado</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {vectorPosData?.state.last_checked_invoice_id ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Último ID importado</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {vectorPosData?.state.last_imported_invoice_id ?? "-"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Última corrida</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatDate(vectorPosData?.state.last_run_at)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Racha de no encontrados</p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {vectorPosData?.state.miss_streak ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Error reciente</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {vectorPosData?.state.last_error || "Sin errores"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Habilitar sincronización</p>
                    <p className="text-xs text-muted-foreground">
                      Cuando está activa, el sistema podrá importar facturas nuevas desde VectorPOS.
                    </p>
                  </div>
                  <Switch checked={vectorPosEnabled} onCheckedChange={setVectorPosEnabled} />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <Label htmlFor="start-from-invoice">ID inicial de VectorPOS</Label>
                <Input
                  id="start-from-invoice"
                  type="number"
                  min={0}
                  value={startFromInvoiceId}
                  onChange={(event) => setStartFromInvoiceId(event.target.value)}
                  className="mt-2"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Define el Último comprobante existente al momento de activación. La sincronización comenzará desde el siguiente ID.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={onSaveVectorPosConfig} disabled={savingVectorPos}>
                {savingVectorPos ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar configuración
              </Button>
              <Button
                variant="outline"
                onClick={onSyncVectorPosNow}
                disabled={syncingVectorPos || !vectorPosEnabled || !hasVectorPosCredentials}
              >
                {syncingVectorPos ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="mr-2 h-4 w-4" />
                )}
                Importar ahora
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrar factura manual</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={onSubmitManualInvoice}>
              <div className="space-y-2 md:col-span-3">
                <Label>Cliente</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name} ({client.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice">Número de factura</Label>
                <Input
                  id="invoice"
                  value={invoiceNumber}
                  onChange={(event) => setInvoiceNumber(event.target.value)}
                  placeholder="FAC-000123"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto (COP)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="50000"
                  min={0}
                  required
                />
              </div>

              <div className="rounded-lg bg-primary/10 p-3">
                <p className="text-xs uppercase text-primary/70">Puntos estimados</p>
                <p className="text-xl font-bold text-primary">{calculatedPoints}</p>
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="comment">Comentario (opcional)</Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Observaciones de la factura"
                />
              </div>

              <div className="md:col-span-3">
                <Button
                  type="submit"
                  disabled={loading || !clientId || !invoiceNumber.trim() || !amount}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Registrar factura
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturas importadas pendientes de asociación ({unmatchedInvoices.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {unmatchedInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay facturas de VectorPOS pendientes por asociar.
              </p>
            ) : (
              unmatchedInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          Factura VectorPOS #{invoice.source_invoice_id || invoice.invoice_number}
                        </p>
                        <Badge variant="outline">Pendiente de asociación</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(getInvoiceDisplayDate(invoice))} | ${invoice.amount.toLocaleString("es-CO")} | {invoice.points_earned} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Teléfono externo: {invoice.source_client_phone || "Sin teléfono"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nombre externo: {invoice.source_client_name || "Sin nombre"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr),auto]">
                    <div className="space-y-2">
                      <Label>Buscar cliente</Label>
                      <Input
                        list={`client-options-${invoice.id}`}
                        placeholder="Nombre | teléfono | correo"
                        value={assignInputs[invoice.id] || ""}
                        onChange={(event) =>
                          setAssignInputs((current) => ({
                            ...current,
                            [invoice.id]: event.target.value,
                          }))
                        }
                      />
                      <datalist id={`client-options-${invoice.id}`}>
                        {clients.map((client) => (
                          <option key={client.id} value={clientOptionLabel(client)} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-2">
                      <Label>Comentario (opcional)</Label>
                      <Input
                        placeholder="Motivo de la asignación"
                        value={assignComments[invoice.id] || ""}
                        onChange={(event) =>
                          setAssignComments((current) => ({
                            ...current,
                            [invoice.id]: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="lg:self-end">
                      <Button
                        type="button"
                        onClick={() => onAssignClient(invoice)}
                        disabled={assigningInvoiceId === invoice.id}
                      >
                        {assigningInvoiceId === invoice.id && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Asociar cliente
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de facturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Factura</th>
                    <th className="px-3 py-2 text-left">Origen</th>
                    <th className="px-3 py-2 text-left">Estado</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-right">Puntos</th>
                    <th className="px-3 py-2 text-left">Emitida por</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                        Sin facturas registradas.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-0 align-top">
                        <td className="px-3 py-2">{formatDate(getInvoiceDisplayDate(invoice))}</td>
                        <td className="px-3 py-2">
                          {invoice.clients?.full_name || invoice.source_client_name || "-"}
                          <p className="text-xs text-muted-foreground">
                            {invoice.clients?.phone || invoice.source_client_phone || "Sin teléfono"}
                          </p>
                        </td>
                        <td className="px-3 py-2">#{invoice.source_invoice_id || invoice.invoice_number}</td>
                        <td className="px-3 py-2">
                          <Badge variant={invoice.source === "vectorpos" ? "secondary" : "outline"}>
                            {invoice.source === "vectorpos" ? "VectorPOS" : "Manual"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={invoice.points_applied_at ? "default" : "outline"}>
                            {invoice.points_applied_at ? "Aplicó puntos" : "Pendiente de asociación"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          ${invoice.amount.toLocaleString("es-CO")}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">
                          +{invoice.points_earned}
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs text-foreground">
                            {invoice.issued_by?.full_name || (invoice.source === "vectorpos" ? "VectorPOS" : "Sin registro")}
                          </p>
                          {invoice.issued_by?.role && (
                            <p className="text-[11px] text-muted-foreground">{invoice.issued_by.role}</p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
