"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2, Plus, Search, X } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Client = {
  id: string
  full_name: string
  email: string
  phone: string
  points?: number
}

type Invoice = {
  id: string
  client_id: string | null
  invoice_number: string
  amount: number
  points_earned: number
  created_at: string
  clients?: { full_name?: string; email?: string; phone?: string } | null
  issued_by?: { full_name?: string; email?: string; role?: string } | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la informacion.")
  }
  return data
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  return new Date(value).toLocaleString("es-CO")
}

function normalizePhone(value: string) {
  return value.replace(/[^\d]/g, "")
}

export default function InvoicesPage() {
  const { data: invoicesData, mutate: mutateInvoices } = useSWR<{ invoices: Invoice[] }>(
    "/api/invoices",
    fetcher,
    { refreshInterval: 15000 },
  )

  const [clientSearch, setClientSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const searchDigits = normalizePhone(clientSearch)
  const shouldSearchClients = clientSearch.trim().length >= 3 || searchDigits.length >= 3

  const { data: clientsData, isLoading: isSearchingClients } = useSWR<{ clients: Client[] }>(
    shouldSearchClients ? `/api/clients?search=${encodeURIComponent(clientSearch)}` : null,
    fetcher,
    { keepPreviousData: true },
  )

  const invoices = useMemo(() => invoicesData?.invoices || [], [invoicesData?.invoices])
  const searchedClients = useMemo(() => clientsData?.clients || [], [clientsData?.clients])
  const selectedClientId = selectedClient?.id || ""
  const calculatedPoints = Number(amount) >= 1000 ? Math.floor(Number(amount) / 1000) : 0

  const matchingClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase()
    if (!query) return []

    return [...searchedClients]
      .sort((left, right) => {
        const leftPhone = normalizePhone(left.phone)
        const rightPhone = normalizePhone(right.phone)
        const leftScore =
          leftPhone === searchDigits
            ? 0
            : leftPhone.startsWith(searchDigits) && searchDigits
              ? 1
              : 2
        const rightScore =
          rightPhone === searchDigits
            ? 0
            : rightPhone.startsWith(searchDigits) && searchDigits
              ? 1
              : 2

        if (leftScore !== rightScore) return leftScore - rightScore
        return left.full_name.localeCompare(right.full_name)
      })
      .slice(0, 8)
  }, [clientSearch, searchDigits, searchedClients])

  const onSelectClient = (client: Client) => {
    setSelectedClient(client)
    setClientSearch(client.phone)
  }

  const clearSelectedClient = () => {
    setSelectedClient(null)
    setClientSearch("")
  }

  const onSubmitManualInvoice = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedClientId) {
      setFeedback({
        type: "error",
        message: "Busca y selecciona un cliente por numero de telefono antes de facturar.",
      })
      return
    }

    setLoading(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
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

      setInvoiceNumber("")
      setAmount("")
      setComment("")
      setSelectedClient(null)
      setClientSearch("")
      setFeedback({ type: "ok", message: "Factura manual registrada correctamente." })
      await mutateInvoices()
    } catch {
      setFeedback({ type: "error", message: "Error de conexion." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
          <p className="text-sm text-muted-foreground">
            Registra facturas manuales y revisa el historial completo de compras acreditadas.
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,26rem),minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Registrar factura manual</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={onSubmitManualInvoice}>
                <div className="space-y-2">
                  <Label htmlFor="client-search">Buscar cliente por telefono</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="client-search"
                      value={clientSearch}
                      onChange={(event) => {
                        setClientSearch(event.target.value)
                        if (selectedClient && event.target.value !== selectedClient.phone) {
                          setSelectedClient(null)
                        }
                      }}
                      className="pl-9 pr-10"
                      placeholder="Ej: 3001234567"
                    />
                    {clientSearch && (
                      <button
                        type="button"
                        onClick={clearSelectedClient}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label="Limpiar busqueda"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La busqueda prioriza coincidencias exactas y prefijos del numero telefonico.
                  </p>
                </div>

                {selectedClient ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-semibold text-foreground">{selectedClient.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient.phone}</p>
                    <p className="text-xs text-muted-foreground">{selectedClient.email}</p>
                  </div>
                ) : shouldSearchClients ? (
                  <div className="space-y-2 rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">Resultados</p>
                      {isSearchingClients && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {matchingClients.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No encontramos clientes con ese numero o termino de busqueda.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {matchingClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => onSelectClient(client)}
                            className="flex w-full flex-col rounded-lg border p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
                          >
                            <span className="text-sm font-medium text-foreground">{client.full_name}</span>
                            <span className="text-xs text-muted-foreground">{client.phone}</span>
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Escribe al menos 3 caracteres del numero telefonico para buscar el cliente.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr),10rem]">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-number">Numero de factura</Label>
                    <Input
                      id="invoice-number"
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
                      min={0}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      placeholder="50000"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-primary/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-primary/70">Puntos estimados</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{calculatedPoints}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Comentario (opcional)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Observaciones de la factura"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={loading || !selectedClientId || !invoiceNumber.trim() || !amount}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Registrar factura
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de facturas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin facturas registradas.</p>
              ) : (
                <>
                  <div className="space-y-3 lg:hidden">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="rounded-xl border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Factura #{invoice.invoice_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(invoice.created_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              ${invoice.amount.toLocaleString("es-CO")}
                            </p>
                            <p className="text-xs font-medium text-primary">+{invoice.points_earned} pts</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <p>Cliente: {invoice.clients?.full_name || "Sin registro"}</p>
                          <p>Telefono: {invoice.clients?.phone || "Sin telefono"}</p>
                          <p>Emitida por: {invoice.issued_by?.full_name || "Sin registro"}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left">Fecha</th>
                          <th className="px-3 py-2 text-left">Cliente</th>
                          <th className="px-3 py-2 text-left">Factura</th>
                          <th className="px-3 py-2 text-right">Monto</th>
                          <th className="px-3 py-2 text-right">Puntos</th>
                          <th className="px-3 py-2 text-left">Emitida por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b align-top last:border-0">
                            <td className="px-3 py-3">{formatDate(invoice.created_at)}</td>
                            <td className="px-3 py-3">
                              <p className="font-medium text-foreground">
                                {invoice.clients?.full_name || "Sin registro"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {invoice.clients?.phone || "Sin telefono"}
                              </p>
                            </td>
                            <td className="px-3 py-3">#{invoice.invoice_number}</td>
                            <td className="px-3 py-3 text-right">
                              ${invoice.amount.toLocaleString("es-CO")}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold text-primary">
                              +{invoice.points_earned}
                            </td>
                            <td className="px-3 py-3">
                              {invoice.issued_by?.full_name || "Sin registro"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}
