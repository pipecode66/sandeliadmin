"use client"

import { useApp } from "@/lib/app-context"
import { Home, Receipt, Gift } from "lucide-react"

const tabs = [
  { key: "home" as const, label: "Inicio", icon: Home },
  { key: "history" as const, label: "Historial", icon: Receipt },
  { key: "redeemables" as const, label: "Reclamables", icon: Gift },
]

export function BottomNav() {
  const { mainTab, setMainTab } = useApp()

  return (
    <nav className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md safe-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = mainTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMainTab(tab.key)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-all active:scale-95 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  isActive ? "bg-primary/10" : ""
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-all ${
                    isActive ? "text-primary" : ""
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[11px] font-medium ${
                  isActive ? "text-primary" : ""
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
