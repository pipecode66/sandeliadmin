"use client"

import { useApp } from "@/lib/app-context"
import { Calendar, Receipt, Star } from "lucide-react"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value)
}

export function HistoryTab() {
  const { purchases } = useApp()

  const totalPoints = purchases.reduce((sum, purchase) => sum + purchase.pointsEarned, 0)
  const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.total, 0)

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h2 className="mb-1 text-xl font-bold text-foreground">Historial de compras</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Revisa tus facturas registradas y los puntos ganados.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary p-3 text-center">
          <p className="text-lg font-bold text-foreground">{purchases.length}</p>
          <p className="text-[10px] text-muted-foreground">Facturas</p>
        </div>
        <div className="rounded-xl bg-primary/5 p-3 text-center">
          <p className="text-lg font-bold text-primary">{totalPoints}</p>
          <p className="text-[10px] text-muted-foreground">Pts ganados</p>
        </div>
        <div className="rounded-xl bg-secondary p-3 text-center">
          <p className="text-xs font-bold text-foreground">{formatCurrency(totalAmount)}</p>
          <p className="text-[10px] text-muted-foreground">Total compras</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {purchases.map((purchase) => (
          <div key={purchase.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Factura #{purchase.invoiceNumber}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(purchase.date)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1">
                <Star className="h-3 w-3 text-primary" fill="currentColor" />
                <span className="text-xs font-bold text-primary">+{purchase.pointsEarned}</span>
              </div>
            </div>

            <p className="text-sm font-medium text-foreground">{formatCurrency(purchase.total)}</p>
          </div>
        ))}
      </div>

      {purchases.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Receipt className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">Sin compras aun</p>
          <p className="text-sm text-muted-foreground">Tus facturas apareceran aqui</p>
        </div>
      )}
    </div>
  )
}
