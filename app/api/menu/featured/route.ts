import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { setFeaturedMenuProduct } from "@/lib/menu-admin"
import { isMissingMenuFeaturedColumnError, MENU_MISSING_FEATURED_MESSAGE } from "@/lib/menu-catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json().catch(() => ({}))
  const categoryId = String(body.categoryId || "").trim()
  const productId = body.productId ? String(body.productId).trim() : null

  if (!categoryId) {
    return NextResponse.json({ error: "La categoria es obligatoria." }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (productId) {
    const { data: product } = await supabase
      .from("menu_products")
      .select("id, category_id")
      .eq("id", productId)
      .maybeSingle()

    if (!product || product.category_id !== categoryId) {
      return NextResponse.json(
        { error: "El producto destacado no pertenece a la categoria." },
        { status: 400 },
      )
    }
  }

  const featuredResult = await setFeaturedMenuProduct(supabase, categoryId, productId)
  if (!featuredResult.ok) {
    if (isMissingMenuFeaturedColumnError(featuredResult.error)) {
      return NextResponse.json({ error: MENU_MISSING_FEATURED_MESSAGE }, { status: 500 })
    }
    return NextResponse.json({ error: featuredResult.error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "menu_product",
    entityId: productId,
    action: productId ? "feature" : "clear_feature",
    afterData: { categoryId, productId },
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ success: true, product: featuredResult.data || null })
}
