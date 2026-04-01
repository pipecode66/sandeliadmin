export const MENU_ICON_OPTIONS = [
  { value: "utensils", label: "General" },
  { value: "breakfast", label: "Desayunos" },
  { value: "sandwich", label: "Sandwich" },
  { value: "burger", label: "Hamburguesas" },
  { value: "pizza", label: "Pizzas" },
  { value: "dessert", label: "Postres" },
  { value: "cake", label: "Tortas" },
  { value: "cold_drink", label: "Bebidas frias" },
  { value: "ice_cream", label: "Helados" },
  { value: "hot_drink", label: "Bebidas calientes" },
  { value: "market", label: "Minimarket" },
] as const

export type MenuIconKey = (typeof MENU_ICON_OPTIONS)[number]["value"]

const MENU_ICON_SET = new Set<MenuIconKey>(MENU_ICON_OPTIONS.map((option) => option.value))

export const MENU_MISSING_TABLES_MESSAGE =
  "Tablas del menu no encontradas. Ejecuta scripts/010_menu_catalog.sql."

export function normalizeMenuIconKey(value: unknown): MenuIconKey {
  if (typeof value === "string" && MENU_ICON_SET.has(value as MenuIconKey)) {
    return value as MenuIconKey
  }
  return "utensils"
}

export function parseSortOrder(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.trunc(parsed)
}

export function parsePriceCop(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const normalized = Math.trunc(parsed)
  if (normalized < 0) return null
  return normalized
}

export function formatPriceCop(value: number) {
  return `$${new Intl.NumberFormat("es-CO").format(Math.max(0, Math.trunc(value)))}`
}

export function isMissingMenuTablesError(error: { code?: string } | null | undefined) {
  return error?.code === "42P01"
}

type MenuCategoryRow = {
  id: string
  title: string
  blurb: string | null
  icon_key: string | null
  banner_image_url: string | null
  sort_order: number | null
}

type MenuSectionRow = {
  id: string
  category_id: string
  title: string
  sort_order: number | null
}

type MenuProductRow = {
  id: string
  category_id: string
  section_id: string | null
  title: string
  description: string | null
  price_cop: number
  image_url: string | null
  sort_order: number | null
}

export function buildPublicMenuCatalog(
  categories: MenuCategoryRow[],
  sections: MenuSectionRow[],
  products: MenuProductRow[],
) {
  const productsBySection = new Map<string, MenuProductRow[]>()
  const rootProductsByCategory = new Map<string, MenuProductRow[]>()

  for (const product of products) {
    if (product.section_id) {
      const current = productsBySection.get(product.section_id) || []
      current.push(product)
      productsBySection.set(product.section_id, current)
      continue
    }

    const current = rootProductsByCategory.get(product.category_id) || []
    current.push(product)
    rootProductsByCategory.set(product.category_id, current)
  }

  const sectionsByCategory = new Map<string, MenuSectionRow[]>()
  for (const section of sections) {
    const current = sectionsByCategory.get(section.category_id) || []
    current.push(section)
    sectionsByCategory.set(section.category_id, current)
  }

  const mapProduct = (product: MenuProductRow) => ({
    id: product.id,
    sectionId: product.section_id,
    name: product.title,
    description: product.description || "",
    details: [],
    price: formatPriceCop(product.price_cop),
    priceAmount: product.price_cop,
    imageSrc: product.image_url,
    imageAlt: `Imagen de ${product.title}`,
  })

  return categories.map((category) => {
    const categorySections = (sectionsByCategory.get(category.id) || [])
      .sort((left, right) => {
        const orderDiff = (left.sort_order || 0) - (right.sort_order || 0)
        if (orderDiff !== 0) return orderDiff
        return left.title.localeCompare(right.title)
      })
      .map((section) => ({
        id: section.id,
        title: section.title,
        products: (productsBySection.get(section.id) || [])
          .sort((left, right) => {
            const orderDiff = (left.sort_order || 0) - (right.sort_order || 0)
            if (orderDiff !== 0) return orderDiff
            return left.title.localeCompare(right.title)
          })
          .map(mapProduct),
      }))

    const rootProducts = (rootProductsByCategory.get(category.id) || [])
      .sort((left, right) => {
        const orderDiff = (left.sort_order || 0) - (right.sort_order || 0)
        if (orderDiff !== 0) return orderDiff
        return left.title.localeCompare(right.title)
      })
      .map(mapProduct)

    return {
      id: category.id,
      title: category.title,
      blurb: category.blurb || "",
      iconKey: normalizeMenuIconKey(category.icon_key),
      bannerImageUrl: category.banner_image_url,
      products: [...rootProducts, ...categorySections.flatMap((section) => section.products)],
      sections: categorySections,
    }
  })
}
