"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminUserStatsBoard } from "@/components/admin/admin-user-stats-board"

export default function AdminMetricsPage() {
  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metricas</h1>
          <p className="text-sm text-muted-foreground">
            Revisa tus estadisticas y compara el rendimiento del equipo por facturas, clientes y codigos validados.
          </p>
        </div>

        <AdminUserStatsBoard editableGoals={false} showOwnSpotlight />
      </div>
    </AdminShell>
  )
}
