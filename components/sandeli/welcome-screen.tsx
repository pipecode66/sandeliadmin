"use client"

import { useApp } from "@/lib/app-context"
import { ArrowRight, Copy, Check } from "lucide-react"
import { useState } from "react"

const AVATAR_ICONS: Record<string, string> = {
  a1: "🥗",
  a2: "🍎",
  a3: "🥑",
  a4: "🌿",
  a5: "🍊",
  a6: "🥤",
}

export function WelcomeScreen() {
  const { user, setScreen } = useApp()
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(user.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const avatarDisplay =
    user.avatarType === "custom" && user.avatar ? (
      <img
        src={user.avatar}
        alt="Tu avatar"
        className="h-28 w-28 rounded-full border-4 border-primary-foreground object-cover shadow-xl"
      />
    ) : (
      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary-foreground bg-primary-foreground/20 text-5xl shadow-xl">
        {AVATAR_ICONS[user.avatar || "a1"] || "🥗"}
      </div>
    )

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Purple hero */}
      <div className="relative flex flex-col items-center bg-primary px-6 pt-16 pb-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-primary-foreground/5" />
          <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary-foreground/5" />
        </div>

        <div className="relative mb-5">{avatarDisplay}</div>

        <h1 className="mb-2 text-center text-2xl font-bold text-primary-foreground">
          {"Hola, " + user.name + "!"}
        </h1>
        <p className="text-center text-sm text-primary-foreground/80">
          Bienvenido/a al programa de fidelizacion Sandeli
        </p>
      </div>

      {/* Content card */}
      <div className="-mt-8 flex flex-1 flex-col rounded-t-3xl bg-background px-6 pt-8 pb-8">
        {/* User code */}
        <div className="mb-6 rounded-2xl bg-secondary p-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tu codigo exclusivo
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-foreground">
              {user.userCode}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all active:scale-90"
              aria-label="Copiar codigo"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Este codigo te identifica como usuario exclusivo de Sandeli
          </p>
        </div>

        {/* Info cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-primary/5 p-4">
            <p className="text-2xl font-bold text-primary">{user.points}</p>
            <p className="text-xs text-muted-foreground">Puntos acumulados</p>
          </div>
          <div className="rounded-2xl bg-accent/10 p-4">
            <p className="text-2xl font-bold text-accent">6</p>
            <p className="text-xs text-muted-foreground">Promociones disponibles</p>
          </div>
        </div>

        <p className="mb-8 text-center text-sm text-muted-foreground">
          Acumula puntos con cada compra y canjeelos por increibles promociones saludables.
        </p>

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setScreen("main")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            Explorar Sandeli
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
