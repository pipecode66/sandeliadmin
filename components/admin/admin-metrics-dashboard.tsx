"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3, DollarSign, FileText, Loader2, RefreshCcw, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type MetricsPeriod = "daily" | "weekly" | "monthly"
type AdminRole = "super_admin" | "gerente" | "supervisor" | "caja"

type PeriodMetrics = {
  invoices: number
  invoiceAmount: number
  clients: number
  redemptions: number
}

type AnalyticsUser = {
  id: string
  fullName: string
  role: AdminRole
  isActive: boolean
  period: PeriodMetrics
  totals: PeriodMetrics
}

type MetricsPayload = {
  viewer: {
    id: string | null
    role: AdminRole
    full_name: string
  }
  users: Array<{
    id: string
    fullName: string
    role: AdminRole
    isActive: boolean
  }>
  analytics: {
    selectedPeriod: {
      key: MetricsPeriod
      label: string
      start: string
      end: string
    }
    selectedUserId: string | null
    selectedUserName: string | null
    totals: PeriodMetrics
    users: AnalyticsUser[]
  }
}

const PERIOD_OPTIONS: Array<{ value: MetricsPeriod; label: string }> = [
  { value: "daily", label: "Dia" },
  { value: "weekly", label: "Semana" },
  { value: "monthly", label: "Mes" },
]

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super admin",
  gerente: "Gerente",
  supervisor: "Supervisor",
  caja: "Caja",
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudieron cargar las metricas.")
  }
  return data
}

function formatCurrency(value: number) {
  return `$${Math.trunc(value || 0).toLocaleString("es-CO")}`
}

function formatShortName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return value
  const short = `${parts[0]} ${parts[1]}`
  return short.length > 18 ? parts[0] : short
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string | number
  hint: string
  icon: typeof FileText
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminMetricsDashboard() {
  const [period, setPeriod] = useState<MetricsPeriod>("daily")
  const [selectedUserId, setSelectedUserId] = useState<string>("all")

  const query = useMemo(() => {
    const params = new URLSearchParams({ period })
    params.set("user_id", selectedUserId)
    return `/api/admin-users/stats?${params.toString()}`
  }, [period, selectedUserId])

  const { data, error, isLoading } = useSWR<MetricsPayload>(query, fetcher, {
    refreshInterval: 30000,
  })

  const chartData = useMemo(() => {
    return (data?.analytics.users || []).map((user) => ({
      name: formatShortName(user.fullName),
      fullName: user.fullName,
      facturas: user.period.invoices,
      clientes: user.period.clients,
      redenciones: user.period.redemptions,
      monto: user.period.invoiceAmount,
    }))
  }, [data?.analytics.users])

  const selectedWorker = useMemo(() => {
    if (!data?.analytics.selectedUserId) return null
    return data.analytics.users.find((user) => user.id === data.analytics.selectedUserId) || null
  }, [data?.analytics.selectedUserId, data?.analytics.users])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando metricas...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-3 text-sm text-red-700">{error.message}</CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-primary/15">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Filtro de rendimiento</p>
            <p className="text-sm text-muted-foreground">
              {selectedWorker
                ? `Mostrando el rendimiento de ${selectedWorker.fullName} en ${data.analytics.selectedPeriod.label.toLowerCase()}.`
                : `Mostrando el consolidado del equipo en ${data.analytics.selectedPeriod.label.toLowerCase()}.`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Periodo
              </label>
              <Select value={period} onValueChange={(value) => setPeriod(value as MetricsPeriod)}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Selecciona el periodo" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Trabajador
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="min-w-[220px]">
                  <SelectValue placeholder="Selecciona el trabajador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el equipo</SelectItem>
                  {data.users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Facturas"
          value={data.analytics.totals.invoices}
          hint="Emitidas en el periodo filtrado"
          icon={FileText}
        />
        <StatCard
          title="Monto facturado"
          value={formatCurrency(data.analytics.totals.invoiceAmount)}
          hint="Valor total gestionado"
          icon={DollarSign}
        />
        <StatCard
          title="Clientes registrados"
          value={data.analytics.totals.clients}
          hint="Altas creadas por el equipo"
          icon={Users}
        />
        <StatCard
          title="Redenciones"
          value={data.analytics.totals.redemptions}
          hint="Canjes validados en el periodo"
          icon={RefreshCcw}
        />
      </div>

      {selectedWorker && (
        <Card className="border-primary/15 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Trabajador seleccionado</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-foreground">{selectedWorker.fullName}</span>
                <Badge variant="secondary">{ROLE_LABELS[selectedWorker.role]}</Badge>
                <Badge variant={selectedWorker.isActive ? "default" : "outline"}>
                  {selectedWorker.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Historico: {selectedWorker.totals.invoices} facturas, {selectedWorker.totals.clients} clientes, {selectedWorker.totals.redemptions} redenciones y {formatCurrency(selectedWorker.totals.invoiceAmount)} facturados.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por trabajador</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => [value, name]}
                    labelFormatter={(value, payload) => payload?.[0]?.payload?.fullName || value}
                  />
                  <Legend />
                  <Bar dataKey="facturas" name="Facturas" fill="#9333ea" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="clientes" name="Clientes" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="redenciones" name="Redenciones" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No hay actividad para este filtro.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturacion por trabajador</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(Number(value || 0)), "Monto facturado"]}
                    labelFormatter={(value, payload) => payload?.[0]?.payload?.fullName || value}
                  />
                  <Bar dataKey="monto" name="Monto facturado" fill="#22c55e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                No hay montos facturados para este filtro.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.analytics.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay trabajadores con actividad en el filtro seleccionado.</p>
          ) : (
            data.analytics.users.map((user) => (
              <div
                key={user.id}
                className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(0,120px))] md:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{user.fullName}</p>
                    <Badge variant="secondary">{ROLE_LABELS[user.role]}</Badge>
                    <Badge variant={user.isActive ? "default" : "outline"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Historico: {user.totals.invoices} facturas, {user.totals.clients} clientes, {user.totals.redemptions} redenciones.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Facturas</p>
                  <p className="text-lg font-bold text-foreground">{user.period.invoices}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Monto</p>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(user.period.invoiceAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Clientes</p>
                  <p className="text-lg font-bold text-foreground">{user.period.clients}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Redenciones</p>
                  <p className="text-lg font-bold text-foreground">{user.period.redemptions}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
