"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useApp } from "@/lib/app-context"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

const WHATSAPP_SENDER = "3242773556"

export function VerificationScreen() {
  const { pendingLogin, setPendingLogin, setScreen, refreshData } = useApp()
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [debugCode, setDebugCode] = useState(pendingLogin?.debugCode || "")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  useEffect(() => {
    setDebugCode(pendingLogin?.debugCode || "")
  }, [pendingLogin?.debugCode])

  if (!pendingLogin) return null

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const nextDigits = [...digits]
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split("")
      for (let i = 0; i < 6; i++) nextDigits[i] = pasted[i] || ""
      setDigits(nextDigits)
      inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus()
      return
    }
    nextDigits[index] = value
    setDigits(nextDigits)
    setError("")
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const enteredCode = digits.join("")
    if (enteredCode.length !== 6) {
      setError("Ingresa el codigo completo de 6 digitos.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/client/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: pendingLogin.clientId, code: enteredCode }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Codigo invalido o expirado.")
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

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: pendingLogin.identifier }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "No se pudo reenviar el codigo.")
        return
      }

      setPendingLogin({
        ...pendingLogin,
        debugCode: result.code,
      })
      setDebugCode(result.code || "")
      setDigits(["", "", "", "", "", ""])
      setResendCooldown(60)
      inputRefs.current[0]?.focus()
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

        <h2 className="mb-2 text-xl font-bold text-foreground">Codigo de verificacion</h2>
        <p className="mb-2 text-center text-sm text-muted-foreground">
          Ingresa el codigo de 6 digitos enviado via WhatsApp
        </p>
        <p className="mb-1 text-center text-xs text-muted-foreground">Desde: {WHATSAPP_SENDER}</p>
        <p className="mb-8 text-center text-xs font-medium text-primary">
          A: {pendingLogin.displayValue}
        </p>

        <div className="mb-6 flex justify-center gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element
              }}
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={digit}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className={`h-14 w-12 rounded-xl border-2 bg-secondary text-center text-xl font-bold text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                error ? "border-destructive" : "border-border"
              }`}
            />
          ))}
        </div>

        {error && <p className="mb-4 text-center text-sm text-destructive">{error}</p>}

        {debugCode && (
          <div className="mb-6 rounded-xl bg-primary/5 px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">Codigo de desarrollo:</p>
            <p className="font-mono text-lg font-bold tracking-[0.3em] text-primary">{debugCode}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || digits.some((digit) => !digit)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verificar"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading || resendCooldown > 0}
          className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-primary transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "Reenviar codigo"}
        </button>
      </div>
    </div>
  )
}
