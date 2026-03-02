"use client"

import Image from "next/image"
import { useApp } from "@/lib/app-context"
import { Bell, Star } from "lucide-react"
import { useState } from "react"
import { NotificationsPanel } from "./notifications-panel"

export function TopBar() {
  const { user, notifications } = useApp()
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between bg-background/95 px-6 py-4 backdrop-blur-md safe-top">
        {/* Logo */}
        <Image
          src="/images/logo.png"
          alt="Sandeli"
          width={120}
          height={46}
          className="h-9 w-auto"
          style={{ width: "auto", height: "auto" }}
        />

        <div className="flex items-center gap-3">
          {/* Points badge with label */}
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
            <Star className="h-4 w-4 text-primary" fill="currentColor" />
            <span className="text-sm font-bold text-primary">
              {user?.points ?? 0}
            </span>
            <span className="text-[10px] font-medium text-primary/70">
              pts
            </span>
          </div>

          {/* Notifications bell */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-all active:scale-90"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-sandeli-magenta text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </>
  )
}
