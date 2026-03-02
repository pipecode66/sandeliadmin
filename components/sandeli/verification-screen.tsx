"use client"

import { useState } from "react"
import Image from "next/image"
import { useApp } from "@/lib/app-context"
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react"

const PASSWORD_RULE =
  "La contraseña debe tener exactamente 6 caracteres e incluir una mayuscula, un numero y un caracter especial."

function isValidPassword(password: string) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6}$/.test(password)
}

export function VerificationScreen() {
  const { pendingLogin, setPendingLogin, setScreen, refreshData } = useApp()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (!pendingLogin) return null

  const handleSubmit = async () => {
    if (!isValidPassword(password)) {
      setError(PASSWORD_RULE)
      return
    }

    if (confirmPassword !== password) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/client/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: pendingLogin.clientId,
          password,
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "No se pudo guardar la contraseña.")
        return
      }

      setPendingLogin(null)
      await refreshData()
    } catch {
      setError("Error de conexion.")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setPendingLogin(null)
    setScreen("login")
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="relative flex flex-1 flex-col items-center px-6 pt-8">
        <div className="mb-8 flex w-full items-center">
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-all active:scale-90"
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <Image
          src="/images/logo.png"
          alt="Sandeli"
          width={160}
          height={62}
          className="mb-8 h-auto w-auto"
          style={{ width: "auto", height: "auto" }}
        />

        <h2 className="mb-2 text-center text-xl font-bold text-foreground">Crea tu contraseña</h2>
        <p className="mb-1 text-center text-sm text-muted-foreground">
          Primer ingreso para:
        </p>
        <p className="mb-6 text-center text-xs font-medium text-primary">{pendingLogin.displayValue}</p>

        <div className="mb-3 w-full rounded-xl bg-primary/5 px-3 py-2 text-xs text-primary">
          {PASSWORD_RULE}
        </div>

        <div className="relative mb-4 w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError("")
            }}
            placeholder="Nueva contraseña"
            className="w-full rounded-xl border border-border bg-secondary py-3.5 pl-12 pr-12 text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            maxLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <div className="relative mb-4 w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value)
              setError("")
            }}
            placeholder="Confirmar contraseña"
            className="w-full rounded-xl border border-border bg-secondary py-3.5 pl-12 pr-12 text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            maxLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground"
            aria-label={
              showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"
            }
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !password || !confirmPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar contraseña"}
        </button>
      </div>
    </div>
  )
}
