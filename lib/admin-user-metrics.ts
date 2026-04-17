import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeRole } from "@/lib/admin-roles"

export const GOAL_PERIOD_OPTIONS = ["daily", "weekly", "biweekly", "monthly"] as const
export const METRICS_PERIOD_OPTIONS = ["daily", "weekly", "monthly"] as const

export type GoalPeriod = (typeof GOAL_PERIOD_OPTIONS)[number]
export type MetricsPeriod = (typeof METRICS_PERIOD_OPTIONS)[number]

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
  amount: number | null
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

export type AdminUserPeriodMetrics = {
  invoices: number
  invoiceAmount: number
  clients: number
  redemptions: number
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
    invoiceAmount: number
    clients: number
    redemptions: number
  }
  totals: {
    invoices: number
    invoiceAmount: number
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
    totalInvoiceAmount: number
    totalClients: number
    totalRedemptions: number
  }
  analytics: {
    selectedPeriod: {
      key: MetricsPeriod
      label: string
      start: string
      end: string
    }
    selectedUserId: string | null
    selectedUserName: string | null
    totals: AdminUserPeriodMetrics
    users: Array<{
      id: string
      fullName: string
      role: AdminUserMetricsRecord["role"]
      isActive: boolean
      period: AdminUserPeriodMetrics
      totals: AdminUserPeriodMetrics
    }>
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

export function normalizeMetricsPeriod(value: unknown): MetricsPeriod {
  if (value === "weekly" || value === "monthly") return value
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

function getMetricsPeriodWindow(period: MetricsPeriod, now = new Date()) {
  const base = getPeriodWindow(period, now)
  return {
    key: period,
    label: base.label,
    start: base.start,
    end: base.end,
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
  return getAdminUserMetricsWithOptions()
}

export async function getAdminUserMetricsWithOptions(options?: {
  analyticsPeriod?: MetricsPeriod
  selectedUserId?: string | null
}): Promise<
  { ok: true; data: AdminUserMetricsResponse } | { ok: false; error: string; status?: number }
> {
  const supabase = createAdminClient()
  const analyticsPeriod = normalizeMetricsPeriod(options?.analyticsPeriod)
  const analyticsWindow = getMetricsPeriodWindow(analyticsPeriod)
  const requestedUserId = options?.selectedUserId?.trim() || null

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
        .select("issued_by_admin_id, created_at, amount")
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
      const currentPeriodInvoiceRows = invoiceRows.filter((item) =>
        fallsWithin(item.created_at, period.start, period.end),
      )

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
          invoices: currentPeriodInvoiceRows.length,
          invoiceAmount: currentPeriodInvoiceRows.reduce(
            (sum, item) => sum + toSafeCount(item.amount),
            0,
          ),
          clients: clientRows.filter((item) => fallsWithin(item.created_at, period.start, period.end)).length,
          redemptions: redemptionRows.filter((item) => fallsWithin(item.validated_at, period.start, period.end)).length,
        },
        totals: {
          invoices: invoiceRows.length,
          invoiceAmount: invoiceRows.reduce((sum, item) => sum + toSafeCount(item.amount), 0),
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

  const effectiveSelectedUserId =
    requestedUserId && records.some((item) => item.id === requestedUserId) ? requestedUserId : null

  const analyticsUsers = records
    .filter((item) => !effectiveSelectedUserId || item.id === effectiveSelectedUserId)
    .map((item) => {
      const periodInvoiceRows = invoices.filter(
        (invoice) =>
          invoice.issued_by_admin_id === item.id &&
          fallsWithin(invoice.created_at, analyticsWindow.start, analyticsWindow.end),
      )
      const periodClientRows = clientCreates.filter(
        (client) =>
          client.admin_user_id === item.id &&
          fallsWithin(client.created_at, analyticsWindow.start, analyticsWindow.end),
      )
      const periodRedemptionRows = redemptions.filter(
        (redemption) =>
          redemption.validated_by_admin_id === item.id &&
          fallsWithin(redemption.validated_at, analyticsWindow.start, analyticsWindow.end),
      )

      return {
        id: item.id,
        fullName: item.fullName,
        role: item.role,
        isActive: item.isActive,
        period: {
          invoices: periodInvoiceRows.length,
          invoiceAmount: periodInvoiceRows.reduce((sum, row) => sum + toSafeCount(row.amount), 0),
          clients: periodClientRows.length,
          redemptions: periodRedemptionRows.length,
        },
        totals: item.totals,
      }
    })

  const analyticsTotals = analyticsUsers.reduce<AdminUserPeriodMetrics>(
    (sum, item) => ({
      invoices: sum.invoices + item.period.invoices,
      invoiceAmount: sum.invoiceAmount + item.period.invoiceAmount,
      clients: sum.clients + item.period.clients,
      redemptions: sum.redemptions + item.period.redemptions,
    }),
    { invoices: 0, invoiceAmount: 0, clients: 0, redemptions: 0 },
  )

  return {
    ok: true,
    data: {
      goalsTableReady,
      users: records,
      summary: {
        totalUsers: records.length,
        activeUsers: records.filter((item) => item.isActive).length,
        totalInvoices: records.reduce((sum, item) => sum + item.totals.invoices, 0),
        totalInvoiceAmount: records.reduce((sum, item) => sum + item.totals.invoiceAmount, 0),
        totalClients: records.reduce((sum, item) => sum + item.totals.clients, 0),
        totalRedemptions: records.reduce((sum, item) => sum + item.totals.redemptions, 0),
      },
      analytics: {
        selectedPeriod: {
          key: analyticsWindow.key,
          label: analyticsWindow.label,
          start: analyticsWindow.start.toISOString(),
          end: analyticsWindow.end.toISOString(),
        },
        selectedUserId: effectiveSelectedUserId,
        selectedUserName:
          analyticsUsers.length === 1 ? analyticsUsers[0]?.fullName || null : null,
        totals: analyticsTotals,
        users: analyticsUsers,
      },
    },
  }
}
