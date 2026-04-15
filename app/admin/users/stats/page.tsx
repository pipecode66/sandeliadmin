"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { AdminUserStatsBoard } from "@/components/admin/admin-user-stats-board"

export default function AdminUsersStatsPage() {
  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estadisticas de usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Configura metas por usuario y revisa cuantas facturas, clientes y redenciones ha gestionado cada perfil.
          </p>
        </div>

        <AdminUserStatsBoard editableGoals showOwnSpotlight={false} />
      </div>
    </AdminShell>
  )
}
