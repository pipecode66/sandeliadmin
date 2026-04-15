import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeRole } from "@/lib/admin-roles"

export const GOAL_PERIOD_OPTIONS = ["daily", "weekly", "biweekly", "monthly"] as const

export type GoalPeriod = (typeof GOAL_PERIOD_OPTIONS)[number]

type AdminUserRow = {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
}

type GoalRow = {
  admin_user_id: string
  goal_period: GoalPeriod
  invoice_goal: number
  client_goal: number
  redemption_goal: number
}

type InvoiceRow = {
  issued_by_admin_id: string | null
  created_at: string | null
}

type RedemptionRow = {
  validated_by_admin_id: string | null
  validated_at: string | null
}

type ClientAuditRow = {
  admin_user_id: string | null
  created_at: string | null
}

export type AdminUserGoalConfig = {
  goalPeriod: GoalPeriod
  invoiceGoal: number
  clientGoal: number
  redemptionGoal: number
}

export type AdminUserMetricsRecord = {
  id: string
  authUserId: string
  email: string
  fullName: string
  role: "super_admin" | "gerente" | "supervisor" | "caja"
  isActive: boolean
  createdAt: string
  goals: AdminUserGoalConfig
  currentPeriod: {
    key: GoalPeriod
    label: string
    start: string
    end: string
    invoices: number
    clients: number
    redemptions: number
  }
  totals: {
    invoices: number
    clients: number
    redemptions: number
  }
}

export type AdminUserMetricsResponse = {
  goalsTableReady: boolean
  users: AdminUserMetricsRecord[]
  summary: {
    totalUsers: number
    activeUsers: number
    totalInvoices: number
    totalClients: number
    totalRedemptions: number
  }
}

function getRoleOrder(role: AdminUserMetricsRecord["role"]) {
  if (role === "super_admin") return 0
  if (role === "gerente") return 1
  if (role === "supervisor") return 2
  return 3
}

function normalizeGoalPeriod(value: unknown): GoalPeriod {
  if (value === "weekly" || value === "biweekly" || value === "monthly") return value
  return "daily"
}

function getDefaultGoals(): AdminUserGoalConfig {
  return {
    goalPeriod: "daily",
    invoiceGoal: 0,
    clientGoal: 0,
    redemptionGoal: 0,
  }
}

function toSafeCount(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.trunc(parsed)
}

function getPeriodWindow(period: GoalPeriod, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)

  if (period === "weekly") {
    const weekday = (start.getDay() + 6) % 7
    start.setDate(start.getDate() - weekday)
  } else if (period === "biweekly") {
    if (start.getDate() <= 15) {
      start.setDate(1)
    } else {
      start.setDate(16)
    }
  } else if (period === "monthly") {
    start.setDate(1)
  }

  const label =
    period === "weekly"
      ? "Semana actual"
      : period === "biweekly"
        ? "Quincena actual"
        : period === "monthly"
          ? "Mes actual"
          : "Hoy"

  return {
    key: period,
    label,
    start,
    end,
  }
}

function fallsWithin(value: string | null | undefined, start: Date, end: Date) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return timestamp >= start.getTime() && timestamp <= end.getTime()
}

export async function getAdminUserMetrics(): Promise<
  { ok: true; data: AdminUserMetricsResponse } | { ok: false; error: string; status?: number }
> {
  const supabase = createAdminClient()

  const [usersResult, goalsResult, invoicesResult, redemptionsResult, clientsAuditResult] =
    await Promise.all([
      supabase
        .from("admin_users")
        .select("id, auth_user_id, email, full_name, role, is_active, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_user_goals")
        .select("admin_user_id, goal_period, invoice_goal, client_goal, redemption_goal"),
      supabase
        .from("invoices")
        .select("issued_by_admin_id, created_at")
        .not("issued_by_admin_id", "is", null),
      supabase
        .from("redemptions")
        .select("validated_by_admin_id, validated_at")
        .eq("status", "validated")
        .not("validated_by_admin_id", "is", null),
      supabase
        .from("audit_logs")
        .select("admin_user_id, created_at")
        .eq("entity_type", "client")
        .eq("action", "create")
        .not("admin_user_id", "is", null),
    ])

  if (usersResult.error) {
    return { ok: false, error: usersResult.error.message, status: 500 }
  }

  if (invoicesResult.error) {
    return { ok: false, error: invoicesResult.error.message, status: 500 }
  }

  if (redemptionsResult.error) {
    return { ok: false, error: redemptionsResult.error.message, status: 500 }
  }

  if (clientsAuditResult.error) {
    return { ok: false, error: clientsAuditResult.error.message, status: 500 }
  }

  const goalsTableReady = !goalsResult.error || goalsResult.error.code !== "42P01"
  if (goalsResult.error && goalsResult.error.code !== "42P01") {
    return { ok: false, error: goalsResult.error.message, status: 500 }
  }

  const users = (usersResult.data || []) as AdminUserRow[]
  const goalsMap = new Map<string, GoalRow>()
  for (const goal of ((goalsResult.data || []) as GoalRow[])) {
    goalsMap.set(goal.admin_user_id, goal)
  }

  const invoices = (invoicesResult.data || []) as InvoiceRow[]
  const redemptions = (redemptionsResult.data || []) as RedemptionRow[]
  const clientCreates = (clientsAuditResult.data || []) as ClientAuditRow[]

  const records: AdminUserMetricsRecord[] = users
    .map((user) => {
      const role = normalizeRole(user.role)
      if (!role) return null

      const goal = goalsMap.get(user.id)
      const goalConfig: AdminUserGoalConfig = goal
        ? {
            goalPeriod: normalizeGoalPeriod(goal.goal_period),
            invoiceGoal: toSafeCount(goal.invoice_goal),
            clientGoal: toSafeCount(goal.client_goal),
            redemptionGoal: toSafeCount(goal.redemption_goal),
          }
        : getDefaultGoals()

      const period = getPeriodWindow(goalConfig.goalPeriod)

      const invoiceRows = invoices.filter((item) => item.issued_by_admin_id === user.id)
      const clientRows = clientCreates.filter((item) => item.admin_user_id === user.id)
      const redemptionRows = redemptions.filter((item) => item.validated_by_admin_id === user.id)

      return {
        id: user.id,
        authUserId: user.auth_user_id,
        email: user.email,
        fullName: user.full_name,
        role,
        isActive: user.is_active,
        createdAt: user.created_at,
        goals: goalConfig,
        currentPeriod: {
          key: period.key,
          label: period.label,
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          invoices: invoiceRows.filter((item) => fallsWithin(item.created_at, period.start, period.end)).length,
          clients: clientRows.filter((item) => fallsWithin(item.created_at, period.start, period.end)).length,
          redemptions: redemptionRows.filter((item) => fallsWithin(item.validated_at, period.start, period.end)).length,
        },
        totals: {
          invoices: invoiceRows.length,
          clients: clientRows.length,
          redemptions: redemptionRows.length,
        },
      }
    })
    .filter((item): item is AdminUserMetricsRecord => Boolean(item))
    .sort((left, right) => {
      const roleDiff = getRoleOrder(left.role) - getRoleOrder(right.role)
      if (roleDiff !== 0) return roleDiff
      return left.fullName.localeCompare(right.fullName)
    })

  return {
    ok: true,
    data: {
      goalsTableReady,
      users: records,
      summary: {
        totalUsers: records.length,
        activeUsers: records.filter((item) => item.isActive).length,
        totalInvoices: records.reduce((sum, item) => sum + item.totals.invoices, 0),
        totalClients: records.reduce((sum, item) => sum + item.totals.clients, 0),
        totalRedemptions: records.reduce((sum, item) => sum + item.totals.redemptions, 0),
      },
    },
  }
}
