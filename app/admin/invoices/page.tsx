"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2, Plus } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"

type Client = { id: string; full_name: string; email: string }

type Invoice = {
  id: string
  invoice_number: string
  amount: number
  points_earned: number
  created_at: string
  clients?: { full_name?: string; email?: string } | null
  issued_by?: { full_name?: string; email?: string; role?: string } | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la información.")
  }
  return data
}

export default function InvoicesPage() {
  const { data: clientsData } = useSWR<{ clients: Client[] }>("/api/clients", fetcher)
  const { data: invoicesData, mutate } = useSWR<{ invoices: Invoice[] }>(
    "/api/invoices",
    fetcher,
    {
      refreshInterval: 15000,
    },
  )

  const [clientId, setClientId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const clients = useMemo(() => clientsData?.clients || [], [clientsData?.clients])
  const invoices = useMemo(() => invoicesData?.invoices || [], [invoicesData?.invoices])
  const calculatedPoints = Number(amount) >= 1000 ? Math.floor(Number(amount) / 1000) : 0

  const onSubmit = async (event: React.FormEvent) => {
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
      setFeedback({ type: "ok", message: "Factura registrada correctamente." })
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturas</h1>
          <p className="text-sm text-muted-foreground">
            Registra facturas para sumar puntos y revisar quién emitió cada registro.
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
            <CardTitle>Registrar factura</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-3" onSubmit={onSubmit}>
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
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-right">Puntos</th>
                    <th className="px-3 py-2 text-left">Emitida por</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                        Sin facturas registradas.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {new Date(invoice.created_at).toLocaleDateString("es-CO")}
                        </td>
                        <td className="px-3 py-2">{invoice.clients?.full_name || "-"}</td>
                        <td className="px-3 py-2">{invoice.invoice_number}</td>
                        <td className="px-3 py-2 text-right">
                          ${invoice.amount.toLocaleString("es-CO")}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">
                          +{invoice.points_earned}
                        </td>
                        <td className="px-3 py-2">
                          <p className="text-xs text-foreground">
                            {invoice.issued_by?.full_name || "Sin registro"}
                          </p>
                          {invoice.issued_by?.role && (
                            <p className="text-[11px] text-muted-foreground">
                              {invoice.issued_by.role}
                            </p>
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
