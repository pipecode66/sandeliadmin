import { corsJson, corsNoContent } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "GET,OPTIONS"

function shouldDeliverNow(item: Record<string, unknown>, now: Date) {
  const scheduleType = String(item.schedule_type || "immediate")
  const scheduledAt = item.scheduled_at ? new Date(String(item.scheduled_at)) : null
  const day = now.getDate()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  if (scheduleType === "immediate") return true
  if (scheduleType === "once") {
    if (!scheduledAt) return true
    return scheduledAt.getTime() <= now.getTime()
  }
  if (scheduleType === "daily") {
    if (!scheduledAt) return true
    return scheduledAt.getTime() <= now.getTime()
  }
  if (scheduleType === "monthly") {
    const scheduledDay = Number(item.schedule_day || 0)
    return scheduledDay > 0 && day === scheduledDay
  }
  if (scheduleType === "yearly") {
    const scheduledDay = Number(item.schedule_day || 0)
    const scheduledMonth = Number(item.schedule_month || 0)
    const scheduledYear = Number(item.schedule_year || 0)
    if (scheduledDay <= 0 || scheduledMonth <= 0) return false
    if (scheduledYear > 0 && year !== scheduledYear) return false
    return day === scheduledDay && month === scheduledMonth
  }
  return false
}

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, category, description, image_url, schedule_type, scheduled_at, schedule_day, schedule_month, schedule_year, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    return corsJson(request, { error: error.message }, { status: 500 }, CORS_METHODS)
  }

  const now = new Date()
  const notifications = (data || []).filter((item) => shouldDeliverNow(item, now))
  return corsJson(request, { notifications }, { status: 200 }, CORS_METHODS)
}

