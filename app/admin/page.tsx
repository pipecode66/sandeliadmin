"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, Star, FileText, Clock } from "lucide-react"
import useSWR from "swr"
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description?: string
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
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { data, isLoading } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 30000,
  })

  const stats = data?.stats
  const chartData = data?.chartData?.map((d: { date: string; points: number }) => ({
    ...d,
    label: new Date(d.date + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "short",
      day: "numeric",
    }),
  }))

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Resumen general del programa de fidelizacion Sandeli
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Clientes"
            value={isLoading ? "..." : stats?.totalClients ?? 0}
            icon={Users}
          />
          <StatsCard
            title="Total Productos"
            value={isLoading ? "..." : stats?.totalProducts ?? 0}
            icon={Package}
          />
          <StatsCard
            title="Puntos Canjeados Hoy"
            value={isLoading ? "..." : stats?.pointsRedeemedToday ?? 0}
            icon={Star}
          />
          <StatsCard
            title="Facturas Hoy"
            value={isLoading ? "..." : stats?.invoicesToday ?? 0}
            icon={FileText}
          />
        </div>

        {/* Pending redemptions alert */}
        {stats?.pendingRedemptions > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-foreground">
                Tienes{" "}
                <span className="font-bold text-primary">
                  {stats.pendingRedemptions}
                </span>{" "}
                {stats.pendingRedemptions === 1
                  ? "redencion pendiente"
                  : "redenciones pendientes"}{" "}
                de validar.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Puntos Canjeados (7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="points"
                      fill="var(--primary)"
                      radius={[4, 4, 0, 0]}
                      name="Puntos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sin datos aun</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {data?.recentClients?.map(
                  (c: { id: string; full_name: string; created_at: string }) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg bg-secondary p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-foreground">
                          Nuevo cliente: {c.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString("es-CO")}
                        </p>
                      </div>
                    </div>
                  )
                )}
                {data?.recentInvoices?.map(
                  (inv: {
                    id: string
                    invoice_number: string
                    amount: number
                    points_earned: number
                    created_at: string
                    clients: { full_name: string }
                  }) => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 rounded-lg bg-secondary p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-foreground">
                          Factura #{inv.invoice_number} - {inv.clients?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${inv.amount.toLocaleString("es-CO")} - {inv.points_earned} pts
                        </p>
                      </div>
                    </div>
                  )
                )}
                {!data?.recentClients?.length && !data?.recentInvoices?.length && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No hay actividad reciente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}
