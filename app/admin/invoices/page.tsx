"use client"

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
import { Loader2, Plus } from "lucide-react"
import { useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type Client = { id: string; full_name: string; email: string }
type Invoice = {
  id: string
  invoice_number: string
  amount: number
  points_earned: number
  created_at: string
  clients?: { full_name?: string; email?: string }
}

export default function InvoicesPage() {
  const { data: clientsData } = useSWR<{ clients: Client[] }>("/api/clients", fetcher)
  const { data: invoicesData, mutate } = useSWR<{ invoices: Invoice[] }>("/api/invoices", fetcher, {
    refreshInterval: 15000,
  })

  const [clientId, setClientId] = useState("")
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const clients = clientsData?.clients || []
  const invoices = invoicesData?.invoices || []
  const calculatedPoints = Number(amount) >= 1000 ? Math.floor(Number(amount) / 1000) : 0

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          invoice_number: invoiceNumber.trim(),
          amount: Number(amount),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "No se pudo registrar la factura.")
        return
      }

      setClientId("")
      setInvoiceNumber("")
      setAmount("")
      mutate()
    } catch {
      setError("Error de conexión.")
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
            Registra facturas para sumar puntos automáticamente a cada cliente.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registrar Factura</CardTitle>
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
                <Label htmlFor="invoice">Número factura</Label>
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

              {error && <p className="text-sm text-destructive md:col-span-3">{error}</p>}

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
                  Registrar Factura
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
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
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
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
