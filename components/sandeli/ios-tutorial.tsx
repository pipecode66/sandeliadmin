"use client"

import { useApp } from "@/lib/app-context"
import { X, Share, Plus, Smartphone } from "lucide-react"
import Image from "next/image"
import { useEffect } from "react"

export function IOSTutorial() {
  const { showIOSTutorial, dismissIOSTutorial } = useApp()

  useEffect(() => {
    if (showIOSTutorial) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [showIOSTutorial])

  if (!showIOSTutorial) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
        onClick={dismissIOSTutorial}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-3xl bg-background px-6 pt-6 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-300 safe-bottom">
        {/* Close */}
        <button
          type="button"
          onClick={dismissIOSTutorial}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-label="Cerrar tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="/images/logoIOS.png"
              alt="Sandeli App"
              width={64}
              height={64}
              className="h-full w-full"
            />
          </div>
        </div>

        <h2 className="mb-2 text-center text-xl font-bold text-foreground">
          Agrega Sandeli a tu inicio
        </h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Accede rapidamente a tu programa de fidelizacion desde tu pantalla de inicio
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Share className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Paso 1: Toca el boton Compartir
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                En Safari, toca el icono de compartir en la barra inferior (el cuadrado con la flecha hacia arriba)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Paso 2: Agregar a pantalla de inicio
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Desliza hacia abajo en el menu y selecciona &quot;Agregar a pantalla de inicio&quot;
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {"Paso 3: Toca \"Agregar\""}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confirma el nombre y toca Agregar. El icono de Sandeli aparecera en tu pantalla de inicio.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissIOSTutorial}
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
