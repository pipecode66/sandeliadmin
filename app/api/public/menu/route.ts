import { buildPublicMenuCatalog, isMissingMenuTablesError } from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const CORS_METHODS = "GET,OPTIONS"

function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", CORS_METHODS)
  response.headers.set("Access-Control-Allow-Headers", "Content-Type")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }))
}

export async function GET() {
  const supabase = createAdminClient()
  const [categoriesResult, sectionsResult, productsResult] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order").order("title"),
    supabase.from("menu_sections").select("*").order("sort_order").order("title"),
    supabase.from("menu_products").select("*").order("sort_order").order("title"),
  ])

  const firstError =
    categoriesResult.error || sectionsResult.error || productsResult.error

  if (firstError) {
    const message = isMissingMenuTablesError(firstError)
      ? "Catálogo del menú no disponible todavía."
      : firstError.message

    return withCors(NextResponse.json({ error: message }, { status: 500 }))
  }

  return withCors(
    NextResponse.json({
      updatedAt: new Date().toISOString(),
      categories: buildPublicMenuCatalog(
        categoriesResult.data || [],
        sectionsResult.data || [],
        productsResult.data || [],
      ),
    }),
  )
}
