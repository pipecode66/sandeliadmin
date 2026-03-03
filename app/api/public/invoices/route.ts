import { corsJson, corsNoContent, requirePublicClient } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "GET,OPTIONS"

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function GET(request: Request) {
  const auth = requirePublicClient(request)
  if (!auth.ok) return auth.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, amount, points_earned, created_at")
    .eq("client_id", auth.clientId)
    .order("created_at", { ascending: false })

  if (error) {
    return corsJson(request, { error: error.message }, { status: 500 }, CORS_METHODS)
  }

  return corsJson(request, { invoices: data || [] }, { status: 200 }, CORS_METHODS)
}
