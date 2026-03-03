"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  Bell,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCcw,
  Tags,
  Users,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clientes", icon: Users },
  { href: "/admin/invoices", label: "Facturas", icon: FileText },
  { href: "/admin/redemptions", label: "Redenciones", icon: RefreshCcw },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/categories", label: "Categorías", icon: Tags },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/notifications", label: "Notificaciones", icon: Bell },
  { href: "/admin/users", label: "Usuarios", icon: Users },
]

const roleLabel: Record<string, string> = {
  super_admin: "Super admin",
  gerente: "Gerente",
  supervisor: "Supervisor",
  caja: "Caja",
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("No autenticado")
  return response.json()
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data } = useSWR<{ admin?: { full_name?: string; role?: string } }>(
    "/api/auth/admin/me",
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
    },
  )

  const adminName = data?.admin?.full_name || "Administrador"
  const adminRole = roleLabel[data?.admin?.role || ""] || "Administrador"
  const adminInitials = useMemo(() => {
    const parts = adminName
      .split(" ")
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length === 0) return "AD"
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }, [adminName])

  const handleLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-secondary">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
              <Image
                src="/images/logoIOS.png"
                alt="logoIOS"
                width={36}
                height={36}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold text-foreground">Sandeli Admin</span>
              <span className="text-xs text-muted-foreground">Panel empresarial</span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          {pathname !== "/admin" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="hidden text-muted-foreground lg:flex"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Volver
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{adminInitials}</span>
            </div>
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium text-foreground">{adminName}</p>
              <p className="text-xs text-muted-foreground">{adminRole}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
