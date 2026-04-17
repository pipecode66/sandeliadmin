"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminMetricsDashboard } from "@/components/admin/admin-metrics-dashboard"

export default function AdminMetricsPage() {
  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metricas</h1>
          <p className="text-sm text-muted-foreground">
            Filtra por dia, semana o mes para revisar cuanto factura el equipo, cuantos clientes registra y cuantas redenciones valida cada trabajador.
          </p>
        </div>

        <AdminMetricsDashboard />
      </div>
    </AdminShell>
  )
}
