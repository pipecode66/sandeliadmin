"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  DollarSign,
  FileText,
  Package,
  RefreshCcw,
  Users,
} from "lucide-react"
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

type RangeValue = "day" | "7d" | "15d" | "30d" | "year"

type DashboardPayload = {
  stats: {
    totalClients: number
    totalProducts: number
    invoices: number
    pointsEarned: number
    amountInvoiced: number
    pointsRedeemed: number
    pendingRedemptions: number
  }
  chartData: Array<{
    date: string
    pointsRedeemed: number
    pointsEarned: number
    invoices: number
  }>
  clients: Array<{ id: string; full_name: string; email: string }>
  clientAnalytics: null | {
    clientId: string
    clientName: string
    totalInvoices: number
    totalAmount: number
    totalPointsEarned: number
    totalRedemptions: number
    totalPointsRedeemed: number
    invoices: Array<{
      id: string
      invoice_number: string
      amount: number
      points_earned: number
      created_at: string
      issued_by?: { full_name?: string }
    }>
    redemptions: Array<{
      id: string
      code: string
      points_spent: number
      created_at: string
      validated_at: string
      products?: { name?: string }
      validated_by?: { full_name?: string }
    }>
  }
  recentInvoices: Array<{
    id: string
    invoice_number: string
    amount: number
    points_earned: number
    created_at: string
    clients?: { full_name?: string }
    issued_by?: { full_name?: string }
  }>
  recentRedemptions: Array<{
    id: string
    code: string
    points_spent: number
    validated_at: string
    products?: { name?: string }
    validated_by?: { full_name?: string }
  }>
}

const rangeLabels: Record<RangeValue, string> = {
  day: "Día específico",
  "7d": "7 días",
  "15d": "15 días",
  "30d": "30 días",
  year: "Anual",
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar el dashboard.")
  }
  return data
}

function StatsCard({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex flex-col">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const today = new Date().toISOString().split("T")[0]
  const [range, setRange] = useState<RangeValue>("7d")
  const [date, setDate] = useState(today)
  const [clientId, setClientId] = useState("all")

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("range", range)
    if (range === "day") params.set("date", date)
    if (clientId !== "all") params.set("client_id", clientId)
    return params.toString()
  }, [range, date, clientId])

  const { data, isLoading, error } = useSWR<DashboardPayload>(
    `/api/dashboard?${queryString}`,
    fetcher,
    { refreshInterval: 30000 },
  )

  const chartData = useMemo(
    () =>
      (data?.chartData || []).map((item) => ({
        ...item,
        label: new Date(`${item.date}T12:00:00`).toLocaleDateString("es-CO", {
          month: "short",
          day: "numeric",
        }),
      })),
    [data?.chartData],
  )

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Analítica general y por cliente para control operativo en tiempo real.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros de análisis</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Rango</Label>
              <Select value={range} onValueChange={(value) => setRange(value as RangeValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día específico</SelectItem>
                  <SelectItem value="7d">7 días</SelectItem>
                  <SelectItem value="15d">15 días</SelectItem>
                  <SelectItem value="30d">30 días</SelectItem>
                  <SelectItem value="year">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fecha (solo para día específico)</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                disabled={range !== "day"}
              />
            </div>

            <div className="space-y-1">
              <Label>Cliente (modo historial)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {(data?.clients || []).map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 text-sm text-red-700">{error.message}</CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total clientes"
            value={isLoading ? "..." : data?.stats.totalClients ?? 0}
            icon={Users}
          />
          <StatsCard
            title="Total productos"
            value={isLoading ? "..." : data?.stats.totalProducts ?? 0}
            icon={Package}
          />
          <StatsCard
            title={`Facturas (${rangeLabels[range]})`}
            value={isLoading ? "..." : data?.stats.invoices ?? 0}
            icon={FileText}
          />
          <StatsCard
            title="Canjes pendientes"
            value={isLoading ? "..." : data?.stats.pendingRedemptions ?? 0}
            icon={RefreshCcw}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Puntos y facturas por periodo</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="pointsRedeemed" name="Puntos redimidos" fill="#f97316" />
                    <Bar dataKey="pointsEarned" name="Puntos ganados" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[260px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sin datos para el rango seleccionado.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comportamiento de facturación</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="invoices"
                      stroke="#16a34a"
                      strokeWidth={2}
                      name="Facturas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[260px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sin datos para el rango seleccionado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StatsCard
            title="Monto facturado"
            value={
              isLoading
                ? "..."
                : `$${(data?.stats.amountInvoiced || 0).toLocaleString("es-CO")}`
            }
            icon={DollarSign}
          />
          <StatsCard
            title="Puntos ganados"
            value={isLoading ? "..." : data?.stats.pointsEarned ?? 0}
            icon={FileText}
          />
          <StatsCard
            title="Puntos redimidos"
            value={isLoading ? "..." : data?.stats.pointsRedeemed ?? 0}
            icon={RefreshCcw}
          />
        </div>

        {data?.clientAnalytics && (
          <Card>
            <CardHeader>
              <CardTitle>
                Historial por cliente: {data.clientAnalytics.clientName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Facturas</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.clientAnalytics.totalInvoices}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="text-xl font-bold text-foreground">
                    ${data.clientAnalytics.totalAmount.toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Puntos ganados</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.clientAnalytics.totalPointsEarned}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Redenciones</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.clientAnalytics.totalRedemptions}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Puntos redimidos</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.clientAnalytics.totalPointsRedeemed}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold text-foreground">Facturas del cliente</p>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {data.clientAnalytics.invoices.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin facturas en el rango.</p>
                    ) : (
                      data.clientAnalytics.invoices.map((invoice) => (
                        <div key={invoice.id} className="rounded border p-2">
                          <p className="text-xs text-foreground">
                            #{invoice.invoice_number} · ${invoice.amount.toLocaleString("es-CO")}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(invoice.created_at).toLocaleString("es-CO")} · Emitida por{" "}
                            {invoice.issued_by?.full_name || "Sin registro"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    Redenciones del cliente
                  </p>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {data.clientAnalytics.redemptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin redenciones en el rango.</p>
                    ) : (
                      data.clientAnalytics.redemptions.map((redemption) => (
                        <div key={redemption.id} className="rounded border p-2">
                          <p className="text-xs text-foreground">
                            {redemption.products?.name || "Producto"} · {redemption.points_spent} pts
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(redemption.validated_at).toLocaleString("es-CO")} · Validada por{" "}
                            {redemption.validated_by?.full_name || "Sin registro"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Actividad reciente: facturas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.recentInvoices || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
              ) : (
                data!.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium text-foreground">
                      #{invoice.invoice_number} · {invoice.clients?.full_name || "Cliente"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${invoice.amount.toLocaleString("es-CO")} · +{invoice.points_earned} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Emitida por {invoice.issued_by?.full_name || "Sin registro"} ·{" "}
                      {new Date(invoice.created_at).toLocaleString("es-CO")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actividad reciente: redenciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.recentRedemptions || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad reciente.</p>
              ) : (
                data!.recentRedemptions.map((redemption) => (
                  <div key={redemption.id} className="rounded-lg border p-3">
                    <p className="text-sm font-medium text-foreground">
                      {redemption.products?.name || "Producto"} · {redemption.points_spent} pts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Código {redemption.code} · Validada por{" "}
                      {redemption.validated_by?.full_name || "Sin registro"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(redemption.validated_at).toLocaleString("es-CO")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Refrescar dashboard
          </Button>
        </div>
      </div>
    </AdminShell>
  )
}
