"use client"

import { useMemo, useState } from "react"
import { useApp } from "@/lib/app-context"
import { Check, ChevronRight, Copy, Gift, LogOut, Star } from "lucide-react"
import Image from "next/image"

const AVATAR_ICONS: Record<string, string> = {
  a1: "🥗",
  a2: "🍎",
  a3: "🥑",
  a4: "🌿",
  a5: "🍊",
  a6: "🥤",
}

export function HomeTab() {
  const { user, products, banners, setMainTab, logout } = useApp()
  const [copied, setCopied] = useState(false)

  const redeemableNow = useMemo(
    () => products.filter((product) => product.pointsCost <= (user?.points || 0)),
    [products, user?.points],
  )

  if (!user) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(user.userCode)
    } catch {
      // Silent fallback.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos dias"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  }

  const openBanner = (url: string | null) => {
    if (!url) return
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-4">
      {banners.length > 0 && (
        <div className="mb-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {banners.map((banner) => {
            const targetUrl = banner.redirectUrl
            return (
              <button
                key={banner.id}
                type="button"
                onClick={() => openBanner(targetUrl)}
                className="relative min-h-[120px] min-w-[280px] overflow-hidden rounded-2xl border bg-card"
              >
                {banner.mediaType === "image" ? (
                  <Image
                    src={banner.mediaUrl}
                    alt="Banner promocional"
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                ) : (
                  <video
                    src={banner.mediaUrl}
                    muted
                    loop
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="mb-5 rounded-2xl bg-primary p-5">
        <div className="flex items-center gap-4">
          {user.avatarType === "custom" && user.avatar ? (
            <img
              src={user.avatar}
              alt="Tu avatar"
              className="h-14 w-14 rounded-full border-2 border-primary-foreground/30 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary-foreground/30 bg-primary-foreground/20 text-2xl">
              {AVATAR_ICONS[user.avatar || "a1"] || "🥗"}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-primary-foreground/70">{greeting()},</p>
            <h2 className="text-xl font-bold text-primary-foreground">{user.name || "Cliente"}</h2>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-4 py-2.5">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wider text-primary-foreground/60">
              Codigo exclusivo
            </p>
            <p className="font-mono text-lg font-bold tracking-widest text-primary-foreground">
              {user.userCode}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground transition-all active:scale-90"
            aria-label="Copiar codigo"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-secondary p-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Star className="h-5 w-5 text-primary" fill="currentColor" />
          </div>
          <p className="text-2xl font-bold text-foreground">{user.points}</p>
          <p className="text-xs text-muted-foreground">Puntos totales</p>
        </div>
        <div className="rounded-2xl bg-secondary p-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20">
            <Gift className="h-5 w-5 text-accent" />
          </div>
          <p className="text-2xl font-bold text-foreground">{redeemableNow.length}</p>
          <p className="text-xs text-muted-foreground">Canjeables ahora</p>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Productos destacados</h3>
          <button
            type="button"
            onClick={() => setMainTab("redeemables")}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            Ver todo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {products.slice(0, 4).map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setMainTab("redeemables")}
              className="min-w-[160px] rounded-2xl border border-border bg-card p-3 text-left transition-all active:scale-[0.98]"
            >
              <div className="relative mb-2 h-24 w-full overflow-hidden rounded-xl bg-secondary">
                <Image src={product.image} alt={product.name} fill className="object-cover" sizes="160px" />
              </div>
              <p className="mb-1 text-sm font-semibold leading-tight text-foreground">{product.name}</p>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-primary" fill="currentColor" />
                <span className="text-xs font-bold text-primary">{product.pointsCost} pts</span>
                {product.pointsCost <= user.points && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    Disponible
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesion
      </button>
    </div>
  )
}
