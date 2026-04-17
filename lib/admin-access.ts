import { hasMinimumRole, type AdminRole } from "@/lib/admin-roles"

export const CAJA_ALLOWED_ADMIN_PATHS = [
  "/admin/clients",
  "/admin/invoices",
  "/admin/redemptions",
  "/admin/metrics",
] as const

function matchesAdminPath(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`)
}

export function getAdminHomePath(role?: AdminRole | null) {
  return role === "caja" ? "/admin/clients" : "/admin"
}

export function canAccessAdminPath(role: AdminRole, pathname: string) {
  if (!pathname.startsWith("/admin")) return true

  if (matchesAdminPath(pathname, "/admin/users")) {
    return hasMinimumRole(role, "gerente")
  }

  if (matchesAdminPath(pathname, "/admin/metrics")) {
    return true
  }

  if (pathname === "/admin") {
    return hasMinimumRole(role, "supervisor")
  }

  if (role !== "caja") return true

  return CAJA_ALLOWED_ADMIN_PATHS.some((basePath) => matchesAdminPath(pathname, basePath))
}
