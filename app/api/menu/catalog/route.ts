import { requireAdmin } from "@/lib/auth"
import {
  isMissingMenuTablesError,
  MENU_MISSING_TABLES_MESSAGE,
} from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const [categoriesResult, sectionsResult, productsResult] = await Promise.all([
    supabase.from("menu_categories").select("*").order("sort_order").order("title"),
    supabase.from("menu_sections").select("*").order("sort_order").order("title"),
    supabase.from("menu_products").select("*").order("sort_order").order("title"),
  ])

  const firstError =
    categoriesResult.error || sectionsResult.error || productsResult.error

  if (firstError) {
    if (isMissingMenuTablesError(firstError)) {
      return NextResponse.json({ error: MENU_MISSING_TABLES_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  return NextResponse.json({
    categories: categoriesResult.data || [],
    sections: sectionsResult.data || [],
    products: productsResult.data || [],
  })
}
