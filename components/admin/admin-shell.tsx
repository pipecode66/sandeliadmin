"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronDown,
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
import { canAccessAdminPath, getAdminHomePath } from "@/lib/admin-access"
import { normalizeRole } from "@/lib/admin-roles"
import { cn } from "@/lib/utils"

type NavLinkItem = {
  type: "link"
  href: string
  label: string
  icon: typeof Users
}

type NavGroupItem = {
  type: "group"
  key: string
  label: string
  icon: typeof Users
  children: Array<{ href: string; label: string }>
}

type NavItem = NavLinkItem | NavGroupItem

const navItems: NavItem[] = [
  { type: "link", href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { type: "link", href: "/admin/clients", label: "Clientes", icon: Users },
  { type: "link", href: "/admin/invoices", label: "Facturas", icon: FileText },
  { type: "link", href: "/admin/redemptions", label: "Redenciones", icon: RefreshCcw },
  { type: "link", href: "/admin/products", label: "Productos", icon: Package },
  { type: "link", href: "/admin/categories", label: "Categorias", icon: Tags },
  { type: "link", href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { type: "link", href: "/admin/menu", label: "Menu Web", icon: BookOpen },
  { type: "link", href: "/admin/notifications", label: "Notificaciones", icon: Bell },
  {
    type: "group",
    key: "users",
    label: "Usuarios",
    icon: Users,
    children: [
      { href: "/admin/users", label: "Perfiles" },
      { href: "/admin/users/stats", label: "Estadisticas" },
    ],
  },
  { type: "link", href: "/admin/metrics", label: "Metricas", icon: BarChart3 },
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
  const [usersMenuOpen, setUsersMenuOpen] = useState(pathname.startsWith("/admin/users"))

  const { data } = useSWR<{ admin?: { full_name?: string; role?: string } }>(
    "/api/auth/admin/me",
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000,
    },
  )

  const resolvedRole = normalizeRole(data?.admin?.role)
  const visibleNavItems = useMemo<NavItem[]>(() => {
    const role = resolvedRole || "caja"
    const result: NavItem[] = []

    for (const item of navItems) {
      if (item.type === "link") {
        if (item.href === "/admin/metrics" && resolvedRole === "super_admin") continue
        if (canAccessAdminPath(role, item.href)) {
          result.push(item)
        }
        continue
      }

      const children = item.children.filter((child) => canAccessAdminPath(role, child.href))
      if (children.length > 0) {
        result.push({ ...item, children })
      }
    }

    return result
  }, [resolvedRole])

  const isForbiddenPath = resolvedRole !== null && !canAccessAdminPath(resolvedRole, pathname)
  const adminHomePath = getAdminHomePath(resolvedRole || null)
  const adminName = data?.admin?.full_name?.trim() || "Cuenta administrativa"
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

  useEffect(() => {
    if (pathname.startsWith("/admin/users")) {
      setUsersMenuOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    if (!resolvedRole || !isForbiddenPath) return
    router.replace(getAdminHomePath(resolvedRole))
  }, [isForbiddenPath, resolvedRole, router])

  const handleLogout = async () => {
    await fetch("/api/auth/admin/logout", { method: "POST" })
    router.push("/admin/login")
    router.refresh()
  }

  if (isForbiddenPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
        <div className="rounded-2xl border border-border bg-card px-6 py-5 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">
            Redirigiendo al modulo disponible para tu rol...
          </p>
        </div>
      </div>
    )
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
          <Link href={adminHomePath} className="flex items-center gap-2">
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
            aria-label="Cerrar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {visibleNavItems.map((item) => {
            if (item.type === "group") {
              const isGroupActive = item.children.some((child) => pathname.startsWith(child.href))

              return (
                <div key={item.key} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setUsersMenuOpen((current) => !current)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isGroupActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", usersMenuOpen && "rotate-180")} />
                  </button>

                  {usersMenuOpen && (
                    <div className="ml-4 space-y-1 border-l border-border pl-3">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href || pathname.startsWith(`${child.href}/`)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors",
                              isChildActive
                                ? "bg-primary/10 font-medium text-primary"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)

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

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Abrir menu"
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

          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto flex items-center gap-2 rounded-full px-2 py-1 text-left transition-colors hover:bg-secondary"
            aria-label="Cerrar sesion desde tu perfil"
            title="Cerrar sesion"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-bold text-primary">{adminInitials}</span>
            </div>
            <div className="hidden leading-tight md:block">
              <p className="text-sm font-medium text-foreground">{adminName}</p>
              <p className="text-xs text-muted-foreground">{adminRole}</p>
            </div>
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
