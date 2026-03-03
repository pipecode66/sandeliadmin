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
      .select("id, name, points_cost, created_at")
      .order("name"),
    supabase
      .from("products")
      .select("id, name, description, image_url, category_id, points_cost, categories(name, points_cost)")
      .order("created_at", { ascending: false }),
    supabase
      .from("banners")
      .select("id, media_url, media_type, redirect_type, redirect_url, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ])

  const firstError =
    categoriesResult.error || productsResult.error || bannersResult.error

  if (firstError) {
    return corsJson(
      request,
      { error: firstError.message || "No se pudo cargar el catálogo." },
      { status: 500 },
      CORS_METHODS,
    )
  }

  return corsJson(
    request,
    {
      updatedAt: new Date().toISOString(),
      categories: categoriesResult.data || [],
      products: productsResult.data || [],
      banners: bannersResult.data || [],
    },
    { status: 200 },
    CORS_METHODS,
  )
}
