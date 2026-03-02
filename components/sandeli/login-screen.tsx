"use client"

import { useState } from "react"
import Image from "next/image"
import { useApp } from "@/lib/app-context"
import { Mail, Phone, ArrowRight, Loader2 } from "lucide-react"
import { CountryCodeSelector } from "./country-code-selector"
import { countryCodes, type CountryCode } from "@/lib/country-codes"

const WHATSAPP_SENDER = "3242773556"
const defaultCountry = countryCodes.find((country) => country.code === "CO")!

function normalizePhone(input: string, dialCode: string) {
  const digits = input.replace(/[^\d]/g, "")
  const dialDigits = dialCode.replace(/[^\d]/g, "")
  if (digits.startsWith(dialDigits)) return digits
  return `${dialDigits}${digits}`
}

export function LoginScreen() {
  const { setScreen, setPendingLogin } = useApp()
  const [mode, setMode] = useState<"email" | "phone">("phone")
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(defaultCountry)

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isValidPhone = (phone: string) => /^\d{7,15}$/.test(phone)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    const trimmed = value.trim()
    if (!trimmed) {
      setError("Ingresa un correo o telefono.")
      return
    }

    let identifier = trimmed
    let displayValue = trimmed

    if (mode === "email") {
      const normalizedEmail = trimmed.toLowerCase()
      if (!isValidEmail(normalizedEmail)) {
        setError("Ingresa un correo electronico valido.")
        return
      }
      identifier = normalizedEmail
      displayValue = normalizedEmail
    } else {
      const normalizedPhone = normalizePhone(trimmed, selectedCountry.dial)
      if (!isValidPhone(normalizedPhone)) {
        setError("Ingresa un numero telefonico valido.")
        return
      }
      identifier = normalizedPhone
      displayValue = `+${normalizedPhone}`
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "No se pudo iniciar el proceso de verificacion.")
        return
      }

      setPendingLogin({
        mode,
        identifier,
        displayValue,
        clientId: result.clientId,
        debugCode: result.code,
      })
      setScreen("verification")
    } catch {
      setError("Error de conexion. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent/10" />
        </div>

        <div className="relative flex flex-col items-center">
          <Image
            src="/images/logo.png"
            alt="Sandeli - Sano y Delicioso"
            width={260}
            height={100}
            className="mb-6 h-auto w-auto"
            style={{ width: "auto", height: "auto" }}
            priority
          />
          <p className="text-center text-sm text-muted-foreground">
            Tu programa de fidelizacion saludable
          </p>
        </div>
      </div>

      <div className="safe-bottom rounded-t-3xl bg-secondary px-6 pb-10 pt-8">
        <h2 className="mb-1 text-xl font-semibold text-foreground">Iniciar sesion</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          Ingresa tu telefono o correo registrado
        </p>

        <div className="mb-5 flex rounded-xl bg-background p-1">
          <button
            type="button"
            onClick={() => {
              setMode("phone")
              setValue("")
              setError("")
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              mode === "phone"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Phone className="h-4 w-4" />
            Telefono
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("email")
              setValue("")
              setError("")
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all ${
              mode === "email"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            Correo
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "phone" ? (
            <div className="mb-4 flex">
              <CountryCodeSelector selected={selectedCountry} onSelect={setSelectedCountry} />
              <input
                type="tel"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value.replace(/[^\d\s]/g, ""))
                  setError("")
                }}
                placeholder="300 000 0000"
                className="w-full min-w-0 rounded-r-xl border border-border bg-background py-3.5 pl-4 pr-4 text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoComplete="tel"
                inputMode="tel"
              />
            </div>
          ) : (
            <div className="relative mb-4">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="email"
                value={value}
                onChange={(event) => {
                  setValue(event.target.value)
                  setError("")
                }}
                placeholder="tu@correo.com"
                className="w-full rounded-xl border border-border bg-background py-3.5 pl-12 pr-4 text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoComplete="email"
                inputMode="email"
              />
            </div>
          )}

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Enviando codigo...</span>
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Se enviara un codigo por WhatsApp desde el numero {WHATSAPP_SENDER}
        </p>
      </div>
    </div>
  )
}
