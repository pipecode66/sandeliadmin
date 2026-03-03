import { corsJson, corsNoContent, requirePublicClient } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "GET,POST,OPTIONS"

function generateRedemptionCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function GET(request: Request) {
  const auth = requirePublicClient(request)
  if (!auth.ok) return auth.response

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("redemptions")
    .select("id, code, points_spent, status, created_at, validated_at, product_id, products(name, image_url)")
    .eq("client_id", auth.clientId)
    .order("created_at", { ascending: false })

  if (error) {
    return corsJson(request, { error: error.message }, { status: 500 }, CORS_METHODS)
  }

  return corsJson(request, { redemptions: data || [] }, { status: 200 }, CORS_METHODS)
}

export async function POST(request: Request) {
  const auth = requirePublicClient(request)
  if (!auth.ok) return auth.response

  let body: { product_id?: unknown }

  try {
    body = (await request.json()) as { product_id?: unknown }
  } catch {
    return corsJson(request, { error: "JSON inválido." }, { status: 400 }, CORS_METHODS)
  }

  if (!body.product_id || typeof body.product_id !== "string") {
    return corsJson(
      request,
      { error: "Debes indicar el producto a redimir." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from("clients")
    .select("id, points, redeemed_today, last_redeem_date")
    .eq("id", auth.clientId)
    .single()

  if (!client) {
    return corsJson(
      request,
      { error: "Cliente no encontrado." },
      { status: 404 },
      CORS_METHODS,
    )
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, points_cost, categories(points_cost)")
    .eq("id", body.product_id)
    .single()

  if (!product) {
    return corsJson(
      request,
      { error: "Producto no encontrado." },
      { status: 404 },
      CORS_METHODS,
    )
  }

  const pointsCost =
    (product.categories as { points_cost?: number } | null)?.points_cost ||
    product.points_cost

  if (client.points < pointsCost) {
    return corsJson(
      request,
      { error: "No tienes suficientes puntos para redimir este producto." },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const today = new Date().toISOString().split("T")[0]
  const currentRedeemedToday =
    client.last_redeem_date === today ? client.redeemed_today : 0

  if (currentRedeemedToday + pointsCost > 60) {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const waitMinutes = Math.ceil((midnight.getTime() - now.getTime()) / 60000)

    return corsJson(
      request,
      {
        error: "Has alcanzado el límite diario de 60 puntos. Intenta nuevamente mañana.",
        waitMinutes,
      },
      { status: 400 },
      CORS_METHODS,
    )
  }

  const code = generateRedemptionCode()
  const { data: redemption, error } = await supabase
    .from("redemptions")
    .insert({
      client_id: auth.clientId,
      product_id: body.product_id,
      code,
      points_spent: pointsCost,
      status: "pending",
    })
    .select("id, code, points_spent, status, created_at, validated_at, product_id")
    .single()

  if (error) {
    return corsJson(request, { error: error.message }, { status: 500 }, CORS_METHODS)
  }

  return corsJson(
    request,
    { redemption, code },
    { status: 201 },
    CORS_METHODS,
  )
}
