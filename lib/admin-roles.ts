export type AdminRole = "super_admin" | "gerente" | "supervisor" | "caja"

const roleLevel: Record<AdminRole, number> = {
  caja: 1,
  supervisor: 2,
  gerente: 3,
  super_admin: 4,
}

export function hasMinimumRole(currentRole: AdminRole, requiredRole: AdminRole) {
  return roleLevel[currentRole] >= roleLevel[requiredRole]
}

export function normalizeRole(value: string | null | undefined): AdminRole | null {
  if (!value) return null
  if (value === "super_admin") return value
  if (value === "gerente") return value
  if (value === "supervisor") return value
  if (value === "caja") return value
  return null
}

