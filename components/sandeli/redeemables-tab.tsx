"use client"

import { useApp, type RedeemableProduct } from "@/lib/app-context"
import { Star, X, Clock, CheckCircle, AlertTriangle } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

function RedeemPopup({
  code,
  product,
  onClose,
}: {
  code: string
  product: RedeemableProduct
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-background p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">
          Canje exitoso
        </h3>
        <p className="mb-1 text-sm text-muted-foreground">
          {product.name}
        </p>
        <p className="mb-4 text-xs text-muted-foreground">
          Presenta este codigo en el establecimiento para validar tu canje:
        </p>
        <div className="mb-4 rounded-xl bg-primary/5 px-4 py-3">
          <p className="font-mono text-2xl font-bold tracking-[0.2em] text-primary">
            {code}
          </p>
        </div>
        <p className="mb-5 text-xs text-muted-foreground">
          Este codigo sera validado por el administrador en la otra aplicacion.
          Una vez confirmado, tus puntos seran descontados.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground transition-all active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

function LimitPopup({
  waitMinutes,
  onClose,
}: {
  waitMinutes: number
  onClose: () => void
}) {
  const hours = Math.floor(waitMinutes / 60)
  const mins = waitMinutes % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-background p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-bold text-foreground">
          Limite diario alcanzado
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Has alcanzado el limite de 60 puntos canjeables por dia.
          Por favor espera para volver a redimir.
        </p>
        <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            {"Disponible en: "}
            {hours > 0 ? `${hours}h ` : ""}
            {`${mins}min`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-primary-foreground transition-all active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

function ProductDetail({
  product,
  onClose,
  onRedeem,
  canAfford,
  missingPoints,
}: {
  product: RedeemableProduct
  onClose: () => void
  onRedeem: () => void
  canAfford: boolean
  missingPoints: number
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative mt-auto flex max-h-[90dvh] flex-col rounded-t-3xl bg-background shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="h-1 w-10 rounded-full bg-muted" />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all active:scale-90"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex-1 overflow-y-auto px-5 pb-8 safe-bottom">
          {/* Product image */}
          <div className="relative mb-5 h-56 w-full overflow-hidden rounded-2xl bg-secondary">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>

          {/* Product info */}
          <div className="mb-2 flex items-start justify-between">
            <h3 className="text-xl font-bold text-foreground">
              {product.name}
            </h3>
            <span className="ml-2 flex-shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {product.pointsCost} pts
            </span>
          </div>

          <span className="mb-4 inline-block rounded-lg bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            {product.category}
          </span>

          <p className="mb-6 text-sm leading-relaxed text-foreground">
            {product.description}
          </p>

          {/* Availability */}
          {canAfford ? (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Disponible para canjear
              </span>
            </div>
          ) : (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">
                {"No tienes suficientes puntos (faltan " + missingPoints + " pts)"}
              </span>
            </div>
          )}

          {/* Redeem button */}
          <button
            type="button"
            onClick={onRedeem}
            disabled={!canAfford}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Star className="h-5 w-5" fill="currentColor" />
            Canjear por puntos
          </button>
        </div>
      </div>
    </div>
  )
}

export function RedeemablesTab() {
  const { products, user, redeemProduct } = useApp()
  const [activeCategory, setActiveCategory] = useState("Todas")
  const [selectedProduct, setSelectedProduct] = useState<RedeemableProduct | null>(null)
  const [redeemResult, setRedeemResult] = useState<{
    type: "success" | "limit"
    code?: string
    product?: RedeemableProduct
    waitMinutes?: number
  } | null>(null)
  const [redeemError, setRedeemError] = useState("")

  const categories = [
    "Todas",
    ...Array.from(new Set(products.map((p) => p.category))),
  ]

  const filtered =
    activeCategory === "Todas"
      ? products
      : products.filter((p) => p.category === activeCategory)

  const handleRedeem = async (product: RedeemableProduct) => {
    setRedeemError("")
    const result = await redeemProduct(product)
    if (result.success && result.code) {
      setSelectedProduct(null)
      setRedeemResult({ type: "success", code: result.code, product })
    } else if (result.waitMinutes) {
      setSelectedProduct(null)
      setRedeemResult({ type: "limit", waitMinutes: result.waitMinutes })
    } else if (result.error) {
      setRedeemError(result.error)
    }
  }

  const todayStr = new Date().toISOString().split("T")[0]
  const redeemedToday = user?.lastRedeemDate === todayStr ? (user?.redeemedToday ?? 0) : 0
  const remainingToday = 60 - redeemedToday

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      <h2 className="mb-1 text-xl font-bold text-foreground">
        Reclamables
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Canjea tus puntos por productos deliciosos y saludables
      </p>

      {redeemError && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {redeemError}
        </div>
      )}

      {/* Category filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Points and daily limit bar */}
      <div className="mb-5 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5">
          <Star className="h-4 w-4 text-primary" fill="currentColor" />
          <p className="text-sm font-semibold text-foreground">
            <span className="text-primary">{user?.points ?? 0}</span>
            <span className="text-muted-foreground"> pts</span>
          </p>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {"Hoy: "}
            <span className="font-bold text-foreground">{remainingToday}</span>
            {" pts disponibles"}
          </p>
        </div>
      </div>

      {/* Products list */}
      <div className="flex flex-col gap-3">
        {filtered.map((product) => {
          const canAfford = (user?.points ?? 0) >= product.pointsCost
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedProduct(product)}
              className={`w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                canAfford
                  ? "border-primary/20 bg-card"
                  : "border-border bg-card opacity-75"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-center">
                  <div className="mb-1 flex items-start justify-between">
                    <h3 className="text-sm font-semibold text-foreground leading-tight">
                      {product.name}
                    </h3>
                    <span
                      className={`ml-2 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        canAfford
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {product.pointsCost} pts
                    </span>
                  </div>
                  <p className="mb-1.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                  <span
                    className={`self-start rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      canAfford
                        ? "bg-green-100 text-green-700"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {canAfford
                      ? "Disponible"
                      : `Faltan ${product.pointsCost - (user?.points ?? 0)} pts`}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onRedeem={() => handleRedeem(selectedProduct)}
          canAfford={(user?.points ?? 0) >= selectedProduct.pointsCost}
          missingPoints={Math.max(selectedProduct.pointsCost - (user?.points ?? 0), 0)}
        />
      )}

      {/* Redeem success popup */}
      {redeemResult?.type === "success" && redeemResult.code && redeemResult.product && (
        <RedeemPopup
          code={redeemResult.code}
          product={redeemResult.product}
          onClose={() => setRedeemResult(null)}
        />
      )}

      {/* Daily limit popup */}
      {redeemResult?.type === "limit" && redeemResult.waitMinutes && (
        <LimitPopup
          waitMinutes={redeemResult.waitMinutes}
          onClose={() => setRedeemResult(null)}
        />
      )}
    </div>
  )
}
