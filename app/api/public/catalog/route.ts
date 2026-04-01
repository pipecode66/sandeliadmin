import { corsJson, corsNoContent } from "@/lib/public-api"
import { createAdminClient } from "@/lib/supabase/admin"

const CORS_METHODS = "GET,OPTIONS"

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function GET(request: Request) {
  const supabase = createAdminClient()

  const [categoriesResult, productsResult, bannersResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, created_at")
      .order("name"),
    supabase
      .from("products")
      .select("id, name, description, image_url, category_id, points_cost, categories(name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("banners")
      .select(
        "id, media_url, media_type, redirect_type, button_type, redirect_url, is_active, sort_order, start_at, end_at",
      )
      .eq("is_active", true)
      .order("sort_order"),
  ])

  const firstError = categoriesResult.error || productsResult.error || bannersResult.error

  if (firstError) {
    return corsJson(
      request,
      { error: firstError.message || "No se pudo cargar el catalogo." },
      { status: 500 },
      CORS_METHODS,
    )
  }

  const now = Date.now()
  const activeBanners = (bannersResult.data || []).filter((banner) => {
    const start = banner.start_at ? new Date(String(banner.start_at)).getTime() : null
    const end = banner.end_at ? new Date(String(banner.end_at)).getTime() : null
    if (start && now < start) return false
    if (end && now > end) return false
    return true
  })

  return corsJson(
    request,
    {
      updatedAt: new Date().toISOString(),
      categories: categoriesResult.data || [],
      products: productsResult.data || [],
      banners: activeBanners,
    },
    { status: 200 },
    CORS_METHODS,
  )
}
