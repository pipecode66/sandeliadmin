import { createAdminClient } from "@/lib/supabase/admin"

type SupabaseAdminClient = ReturnType<typeof createAdminClient>

export async function setFeaturedMenuProduct(
  supabase: SupabaseAdminClient,
  categoryId: string,
  productId: string | null,
) {
  const { error: clearError } = await supabase
    .from("menu_products")
    .update({ is_featured: false, updated_at: new Date().toISOString() })
    .eq("category_id", categoryId)
    .eq("is_featured", true)

  if (clearError) {
    return { ok: false as const, error: clearError }
  }

  if (!productId) {
    return { ok: true as const }
  }

  const { data, error } = await supabase
    .from("menu_products")
    .update({ is_featured: true, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("category_id", categoryId)
    .select("*")
    .single()

  if (error) {
    return { ok: false as const, error }
  }

  return { ok: true as const, data }
}

export async function reorderMenuEntities(
  supabase: SupabaseAdminClient,
  table: "menu_categories" | "menu_sections" | "menu_products",
  ids: string[],
) {
  for (const [index, id] of ids.entries()) {
    const { error } = await supabase
      .from(table)
      .update({
        sort_order: index,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (error) {
      return { ok: false as const, error }
    }
  }

  return { ok: true as const }
}
