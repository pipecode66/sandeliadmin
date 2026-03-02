"use client"

import { useState, useRef } from "react"
import { useApp } from "@/lib/app-context"
import { Camera, Upload, Check, ArrowRight, X } from "lucide-react"

const PRESET_AVATARS = [
  { id: "a1", emoji: "A", bg: "bg-sandeli-purple", color: "text-primary-foreground" },
  { id: "a2", emoji: "B", bg: "bg-sandeli-magenta", color: "text-primary-foreground" },
  { id: "a3", emoji: "C", bg: "bg-sandeli-lavender", color: "text-primary-foreground" },
  { id: "a4", emoji: "D", bg: "bg-sandeli-dark", color: "text-primary-foreground" },
  { id: "a5", emoji: "E", bg: "bg-sandeli-purple", color: "text-primary-foreground" },
  { id: "a6", emoji: "F", bg: "bg-sandeli-magenta", color: "text-primary-foreground" },
]

const AVATAR_ICONS: Record<string, string> = {
  a1: "🥗",
  a2: "🍎",
  a3: "🥑",
  a4: "🌿",
  a5: "🍊",
  a6: "🥤",
}

export function AvatarSetupScreen() {
  const { user, updateUser, setScreen } = useApp()
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customImage, setCustomImage] = useState<string | null>(null)
  const [name, setName] = useState(user?.name || "")
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar los 2MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten archivos de imagen")
      return
    }

    setError("")
    const reader = new FileReader()
    reader.onloadend = () => {
      setCustomImage(reader.result as string)
      setSelectedPreset(null)
    }
    reader.readAsDataURL(file)
  }

  const handleContinue = () => {
    if (!name.trim()) {
      setError("Ingresa tu nombre")
      return
    }

    if (!selectedPreset && !customImage) {
      setError("Selecciona un avatar o sube una foto")
      return
    }

    updateUser({
      name: name.trim(),
      avatar: customImage || selectedPreset,
      avatarType: customImage ? "custom" : "preset",
    })

    setScreen("welcome")
  }

  const hasSelection = selectedPreset || customImage

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <div className="px-6 pt-14 pb-2">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            1
          </div>
          <div className="h-0.5 flex-1 rounded bg-muted">
            <div className="h-full w-1/2 rounded bg-primary transition-all" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            2
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 pt-6 pb-8">
        <h1 className="mb-1 text-2xl font-bold text-foreground">
          Personaliza tu perfil
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Elige un avatar o sube tu foto y dinos tu nombre
        </p>

        {/* Name input */}
        <div className="mb-6">
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Tu nombre
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError("")
            }}
            placeholder="Ej: Maria, Juan..."
            className="w-full rounded-xl border border-border bg-background py-3 px-4 text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
          />
        </div>

        {/* Preset avatars */}
        <p className="mb-3 text-sm font-medium text-foreground">
          Elige un avatar
        </p>
        <div className="mb-6 grid grid-cols-3 gap-3">
          {PRESET_AVATARS.map((avatar) => (
            <button
              key={avatar.id}
              type="button"
              onClick={() => {
                setSelectedPreset(avatar.id)
                setCustomImage(null)
                setError("")
              }}
              className={`relative flex h-20 flex-col items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${
                selectedPreset === avatar.id
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-secondary"
              }`}
            >
              <span className="text-3xl">{AVATAR_ICONS[avatar.id]}</span>
              {selectedPreset === avatar.id && (
                <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Photo upload */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-medium text-foreground">
            Sube tu foto
          </p>

          {customImage ? (
            <div className="relative flex items-center gap-4 rounded-2xl border-2 border-primary bg-primary/5 p-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-xl">
                <img
                  src={customImage}
                  alt="Tu foto de perfil"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Foto cargada
                </p>
                <p className="text-xs text-muted-foreground">
                  Toca para cambiar
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomImage(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-4 rounded-2xl border-2 border-dashed border-border p-4 text-left transition-all hover:border-primary/40 active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Subir foto de perfil
                </p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG - Maximo 2MB
                </p>
              </div>
              <Upload className="ml-auto h-5 w-5 text-muted-foreground" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-6 pb-8 safe-bottom">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!hasSelection || !name.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          Continuar
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
