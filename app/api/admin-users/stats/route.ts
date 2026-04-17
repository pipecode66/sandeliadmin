import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  GOAL_PERIOD_OPTIONS,
  GoalPeriod,
  getAdminUserMetrics,
  getAdminUserMetricsWithOptions,
  METRICS_PERIOD_OPTIONS,
  MetricsPeriod,
  normalizeMetricsPeriod,
  parseMetricsReferenceDate,
} from "@/lib/admin-user-metrics"
import { createAdminClient } from "@/lib/supabase/admin"

function isValidGoalPeriod(value: unknown): value is GoalPeriod {
  return typeof value === "string" && GOAL_PERIOD_OPTIONS.includes(value as GoalPeriod)
}

function parseGoalValue(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.trunc(parsed)
}

function isValidMetricsPeriod(value: unknown): value is MetricsPeriod {
  return typeof value === "string" && METRICS_PERIOD_OPTIONS.includes(value as MetricsPeriod)
}

export async function GET(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period")
  const selectedUserIdParam = searchParams.get("user_id")
  const referenceDateParam = searchParams.get("reference_date")
  const result = await getAdminUserMetricsWithOptions({
    analyticsPeriod: isValidMetricsPeriod(period) ? period : normalizeMetricsPeriod(period),
    selectedUserId:
      typeof selectedUserIdParam === "string" && selectedUserIdParam !== "all"
        ? selectedUserIdParam
        : null,
    referenceDate: parseMetricsReferenceDate(referenceDateParam),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 500 })
  }

  return NextResponse.json({
    viewer: {
      id: admin.admin.id,
      role: admin.admin.role,
      full_name: admin.admin.full_name,
    },
    ...result.data,
  })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin("super_admin")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const adminUserId = typeof body.admin_user_id === "string" ? body.admin_user_id : ""
  const goalPeriod = body.goal_period
  const invoiceGoal = parseGoalValue(body.invoice_goal)
  const clientGoal = parseGoalValue(body.client_goal)
  const redemptionGoal = parseGoalValue(body.redemption_goal)

  if (!adminUserId || !isValidGoalPeriod(goalPeriod)) {
    return NextResponse.json(
      { error: "Debes indicar un usuario y un periodo de meta valido." },
      { status: 400 },
    )
  }

  if (invoiceGoal === null || clientGoal === null || redemptionGoal === null) {
    return NextResponse.json(
      { error: "Las metas deben ser numeros enteros iguales o mayores a cero." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data: currentGoal, error: currentGoalError } = await supabase
    .from("admin_user_goals")
    .select("admin_user_id, goal_period, invoice_goal, client_goal, redemption_goal")
    .eq("admin_user_id", adminUserId)
    .maybeSingle()

  if (currentGoalError && currentGoalError.code === "42P01") {
    return NextResponse.json(
      { error: "La tabla admin_user_goals no existe. Ejecuta scripts/014_admin_user_goals.sql." },
      { status: 500 },
    )
  }

  if (currentGoalError) {
    return NextResponse.json({ error: currentGoalError.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("admin_user_goals")
    .upsert(
      {
        admin_user_id: adminUserId,
        goal_period: goalPeriod,
        invoice_goal: invoiceGoal,
        client_goal: clientGoal,
        redemption_goal: redemptionGoal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id" },
    )
    .select("admin_user_id, goal_period, invoice_goal, client_goal, redemption_goal")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "admin_user_goal",
    entityId: adminUserId,
    action: currentGoal ? "update" : "create",
    beforeData: currentGoal,
    afterData: data,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ goal: data })
}
