"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  ArrowLeft,
  Coffee,
  Croissant,
  CupSoda,
  GripVertical,
  IceCreamCone,
  Loader2,
  Pencil,
  Pizza,
  Plus,
  Sandwich,
  ShoppingBasket,
  Star,
  Trash2,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { uploadAdminFile } from "@/lib/admin-upload"
import { formatPriceCop, MENU_ICON_OPTIONS } from "@/lib/menu-catalog"
import { cn } from "@/lib/utils"

type MenuCategory = {
  id: string
  title: string
  blurb: string
  icon_key: string
  banner_image_url: string | null
  sort_order: number | null
}

type MenuSection = {
  id: string
  category_id: string
  title: string
  sort_order: number | null
}

type MenuProduct = {
  id: string
  category_id: string
  section_id: string | null
  title: string
  description: string
  price_cop: number
  image_url: string | null
  is_featured: boolean
  sort_order: number | null
}

type MenuCatalogResponse = {
  categories: MenuCategory[]
  sections: MenuSection[]
  products: MenuProduct[]
}

type CategoryFormState = {
  title: string
  blurb: string
  icon_key: string
  banner_image_url: string
  sort_order: string
}

type SectionFormState = {
  title: string
  sort_order: string
}

type ProductFormState = {
  section_id: string
  title: string
  description: string
  price_cop: string
  image_url: string
  sort_order: string
}

const ROOT_SECTION_VALUE = "__root__"

const emptyCategoryForm: CategoryFormState = {
  title: "",
  blurb: "",
  icon_key: "utensils",
  banner_image_url: "",
  sort_order: "0",
}

const emptySectionForm: SectionFormState = {
  title: "",
  sort_order: "0",
}

const emptyProductForm: ProductFormState = {
  section_id: ROOT_SECTION_VALUE,
  title: "",
  description: "",
  price_cop: "",
  image_url: "",
  sort_order: "0",
}

const menuIconMap: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  breakfast: Croissant,
  sandwich: Sandwich,
  burger: Sandwich,
  pizza: Pizza,
  dessert: Star,
  cake: Star,
  cold_drink: CupSoda,
  ice_cream: IceCreamCone,
  hot_drink: Coffee,
  market: ShoppingBasket,
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar el menu web.")
  }
  return data as MenuCatalogResponse
}

function sortMenuItems<T extends { title: string; sort_order: number | null }>(items: T[]) {
  return [...items].sort((left, right) => {
    const orderDiff = (left.sort_order || 0) - (right.sort_order || 0)
    if (orderDiff !== 0) return orderDiff
    return left.title.localeCompare(right.title)
  })
}

function moveItem<T extends { id: string }>(items: T[], activeId: string, overId: string) {
  const currentIndex = items.findIndex((item) => item.id === activeId)
  const nextIndex = items.findIndex((item) => item.id === overId)
  if (currentIndex === -1 || nextIndex === -1 || currentIndex === nextIndex) return items

  const copy = [...items]
  const [moved] = copy.splice(currentIndex, 1)
  copy.splice(nextIndex, 0, moved)
  return copy
}

function applySortOrder<T extends { id: string; sort_order: number | null }>(items: T[], ids: string[]) {
  const indexMap = new Map(ids.map((id, index) => [id, index]))
  return items.map((item) => {
    const nextIndex = indexMap.get(item.id)
    return nextIndex === undefined ? item : { ...item, sort_order: nextIndex }
  })
}

function PreviewMedia({
  src,
  alt,
  ratio = "square",
  className,
}: {
  src: string | null | undefined
  alt: string
  ratio?: "square" | "banner"
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-primary/15 bg-[linear-gradient(180deg,#fbf5ff_0%,#f4ebff_100%)]",
        ratio === "banner" ? "aspect-[1.6/1] min-h-[180px]" : "aspect-square",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 640px"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-[1.4rem] bg-primary/10 p-3">
              <Image src="/images/logo-sandeli.png" alt="Sandeli" fill className="object-contain p-3" sizes="80px" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Sin imagen cargada</p>
              <p className="text-xs text-muted-foreground">Puedes subirla desde el editor.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
  draggedProductId,
  onDragStart,
  onDragEnd,
  onDrop,
  onEdit,
  onDelete,
  onFeature,
}: {
  product: MenuProduct
  draggedProductId: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDrop: (targetId: string) => void
  onEdit: (product: MenuProduct) => void
  onDelete: (product: MenuProduct) => void
  onFeature: (id: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(product.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(product.id)}
      className={cn(
        "group overflow-hidden rounded-[1.5rem] border border-primary/15 bg-white shadow-sm",
        draggedProductId === product.id && "opacity-80",
      )}
    >
      <PreviewMedia src={product.image_url} alt={product.title} className="rounded-none border-0" />
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <GripVertical className="mt-1 h-4 w-4 shrink-0 text-primary/70" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xl font-semibold leading-tight text-foreground">{product.title}</p>
              {product.is_featured ? (
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Destacado
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{product.description || "Sin descripcion."}</p>
            <p className="mt-3 text-3xl font-bold text-primary">{formatPriceCop(product.price_cop)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onFeature(product.id)}>
            <Star className="mr-2 h-4 w-4" />
            Destacar
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(product)}>
            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}

export function MenuWebManager() {
  const { data, error, isLoading, mutate } = useSWR<MenuCatalogResponse>("/api/menu/catalog", fetcher, {
    refreshInterval: 20000,
  })

  const [catalog, setCatalog] = useState<MenuCatalogResponse | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [sectionForm, setSectionForm] = useState(emptySectionForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingSection, setSavingSection] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingProductImage, setUploadingProductImage] = useState(false)
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null)
  const [reorderingCategories, setReorderingCategories] = useState(false)
  const [reorderingSections, setReorderingSections] = useState(false)
  const [reorderingProducts, setReorderingProducts] = useState(false)
  const [updatingFeatured, setUpdatingFeatured] = useState(false)

  useEffect(() => {
    if (data) setCatalog(data)
  }, [data])

  const categories = catalog?.categories || []
  const sections = catalog?.sections || []
  const products = catalog?.products || []

  const sortedCategories = useMemo(() => sortMenuItems(categories), [categories])
  const activeCategory = useMemo(
    () => sortedCategories.find((category) => category.id === selectedCategoryId) || null,
    [selectedCategoryId, sortedCategories],
  )

  const activeSections = useMemo(() => {
    if (!activeCategory) return []
    return sortMenuItems(sections.filter((section) => section.category_id === activeCategory.id))
  }, [activeCategory, sections])

  const activeProducts = useMemo(() => {
    if (!activeCategory) return []
    return sortMenuItems(products.filter((product) => product.category_id === activeCategory.id))
  }, [activeCategory, products])

  const featuredProduct = useMemo(
    () => activeProducts.find((product) => product.is_featured) || null,
    [activeProducts],
  )

  const rootProducts = useMemo(
    () => activeProducts.filter((product) => !product.section_id),
    [activeProducts],
  )

  const groupedSectionProducts = useMemo(
    () =>
      activeSections.map((section) => ({
        section,
        products: activeProducts.filter((product) => product.section_id === section.id),
      })),
    [activeProducts, activeSections],
  )

  useEffect(() => {
    if (selectedCategoryId && !sortedCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(null)
    }
  }, [selectedCategoryId, sortedCategories])

  const requestJson = async (response: Response, fallback: string) => {
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || fallback)
    return result
  }

  const notifySuccess = (title: string, description?: string) => toast({ title, description })
  const notifyError = (title: string, description?: string) =>
    toast({ title, description, variant: "destructive" })

  const resetCategoryForm = () => {
    setEditingCategoryId(null)
    setCategoryForm({ ...emptyCategoryForm, sort_order: String(sortedCategories.length) })
  }

  const resetSectionForm = () => {
    setEditingSectionId(null)
    setSectionForm({ ...emptySectionForm, sort_order: String(activeSections.length) })
  }

  const resetProductForm = () => {
    setEditingProductId(null)
    setProductForm({ ...emptyProductForm, sort_order: String(activeProducts.length) })
  }

  const openNewCategoryDialog = () => {
    resetCategoryForm()
    setCategoryDialogOpen(true)
  }

  const openEditCategoryDialog = (category: MenuCategory) => {
    setEditingCategoryId(category.id)
    setCategoryForm({
      title: category.title,
      blurb: category.blurb || "",
      icon_key: category.icon_key || "utensils",
      banner_image_url: category.banner_image_url || "",
      sort_order: String(category.sort_order ?? 0),
    })
    setCategoryDialogOpen(true)
  }

  const openNewSectionDialog = () => {
    resetSectionForm()
    setSectionDialogOpen(true)
  }

  const openEditSectionDialog = (section: MenuSection) => {
    setEditingSectionId(section.id)
    setSectionForm({
      title: section.title,
      sort_order: String(section.sort_order ?? 0),
    })
    setSectionDialogOpen(true)
  }

  const openNewProductDialog = (sectionId?: string | null) => {
    resetProductForm()
    setProductForm((current) => ({
      ...current,
      section_id: sectionId || ROOT_SECTION_VALUE,
      sort_order: String(
        activeProducts.filter((product) => (product.section_id || ROOT_SECTION_VALUE) === (sectionId || ROOT_SECTION_VALUE)).length,
      ),
    }))
    setProductDialogOpen(true)
  }

  const openEditProductDialog = (product: MenuProduct) => {
    setEditingProductId(product.id)
    setProductForm({
      section_id: product.section_id || ROOT_SECTION_VALUE,
      title: product.title,
      description: product.description || "",
      price_cop: String(product.price_cop ?? 0),
      image_url: product.image_url || "",
      sort_order: String(product.sort_order ?? 0),
    })
    setProductDialogOpen(true)
  }

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true)
    try {
      const url = await uploadAdminFile(file, "menu-category-banners")
      setCategoryForm((current) => ({ ...current, banner_image_url: url }))
      notifySuccess("Banner cargado", "Ya puedes guardar la categoria para publicar el cambio.")
    } catch (uploadError) {
      notifyError("No se pudo subir el banner", uploadError instanceof Error ? uploadError.message : "Intenta nuevamente.")
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleProductImageUpload = async (file: File) => {
    setUploadingProductImage(true)
    try {
      const url = await uploadAdminFile(file, "menu-products")
      setProductForm((current) => ({ ...current, image_url: url }))
      notifySuccess("Imagen cargada", "Ya puedes guardar el producto para publicar el cambio.")
    } catch (uploadError) {
      notifyError("No se pudo subir la imagen", uploadError instanceof Error ? uploadError.message : "Intenta nuevamente.")
    } finally {
      setUploadingProductImage(false)
    }
  }

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingCategory(true)
    try {
      const response = await fetch(
        editingCategoryId ? `/api/menu/categories/${editingCategoryId}` : "/api/menu/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...categoryForm,
            banner_image_url: categoryForm.banner_image_url || null,
            sort_order: Number(categoryForm.sort_order || 0),
          }),
        },
      )
      const result = await requestJson(response, "No se pudo guardar la categoria.")
      notifySuccess(editingCategoryId ? "Categoria actualizada" : "Categoria creada")
      setCategoryDialogOpen(false)
      resetCategoryForm()
      if (!editingCategoryId && result.category?.id) setSelectedCategoryId(result.category.id)
      await mutate()
    } catch (saveError) {
      notifyError("No se pudo guardar la categoria", saveError instanceof Error ? saveError.message : "Intenta nuevamente.")
    } finally {
      setSavingCategory(false)
    }
  }

  const saveSection = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!activeCategory) return
    setSavingSection(true)
    try {
      const response = await fetch(
        editingSectionId ? `/api/menu/sections/${editingSectionId}` : "/api/menu/sections",
        {
          method: editingSectionId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: activeCategory.id,
            ...sectionForm,
            sort_order: Number(sectionForm.sort_order || 0),
          }),
        },
      )
      await requestJson(response, "No se pudo guardar la subseccion.")
      notifySuccess(editingSectionId ? "Subseccion actualizada" : "Subseccion creada")
      setSectionDialogOpen(false)
      resetSectionForm()
      await mutate()
    } catch (saveError) {
      notifyError("No se pudo guardar la subseccion", saveError instanceof Error ? saveError.message : "Intenta nuevamente.")
    } finally {
      setSavingSection(false)
    }
  }

  const saveProduct = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!activeCategory) return
    setSavingProduct(true)
    try {
      const response = await fetch(
        editingProductId ? `/api/menu/products/${editingProductId}` : "/api/menu/products",
        {
          method: editingProductId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: activeCategory.id,
            section_id: productForm.section_id === ROOT_SECTION_VALUE ? null : productForm.section_id,
            title: productForm.title,
            description: productForm.description,
            price_cop: Number(productForm.price_cop || 0),
            image_url: productForm.image_url || null,
            sort_order: Number(productForm.sort_order || 0),
          }),
        },
      )
      await requestJson(response, "No se pudo guardar el producto.")
      notifySuccess(editingProductId ? "Producto actualizado" : "Producto creado", "El destacado ahora se controla solo desde este panel.")
      setProductDialogOpen(false)
      resetProductForm()
      await mutate()
    } catch (saveError) {
      notifyError("No se pudo guardar el producto", saveError instanceof Error ? saveError.message : "Intenta nuevamente.")
    } finally {
      setSavingProduct(false)
    }
  }

  const deleteCategory = async (category: MenuCategory) => {
    if (!window.confirm(`Eliminar la categoria \"${category.title}\" tambien borrara sus subsecciones y productos.`)) return
    try {
      const response = await fetch(`/api/menu/categories/${category.id}`, { method: "DELETE" })
      await requestJson(response, "No se pudo eliminar la categoria.")
      if (selectedCategoryId === category.id) setSelectedCategoryId(null)
      notifySuccess("Categoria eliminada")
      await mutate()
    } catch (deleteError) {
      notifyError("No se pudo eliminar la categoria", deleteError instanceof Error ? deleteError.message : "Intenta nuevamente.")
    }
  }

  const deleteSection = async (section: MenuSection) => {
    if (!window.confirm(`Eliminar la subseccion \"${section.title}\" dejara sus productos en la categoria raiz.`)) return
    try {
      const response = await fetch(`/api/menu/sections/${section.id}`, { method: "DELETE" })
      await requestJson(response, "No se pudo eliminar la subseccion.")
      notifySuccess("Subseccion eliminada")
      await mutate()
    } catch (deleteError) {
      notifyError("No se pudo eliminar la subseccion", deleteError instanceof Error ? deleteError.message : "Intenta nuevamente.")
    }
  }

  const deleteProduct = async (product: MenuProduct) => {
    if (!window.confirm(`Eliminar el producto \"${product.title}\"?`)) return
    try {
      const response = await fetch(`/api/menu/products/${product.id}`, { method: "DELETE" })
      await requestJson(response, "No se pudo eliminar el producto.")
      notifySuccess("Producto eliminado")
      await mutate()
    } catch (deleteError) {
      notifyError("No se pudo eliminar el producto", deleteError instanceof Error ? deleteError.message : "Intenta nuevamente.")
    }
  }

  const persistReorder = async (entity: "category" | "section" | "product", ids: string[], successTitle: string) => {
    try {
      const response = await fetch("/api/menu/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, ids }),
      })
      await requestJson(response, "No se pudo guardar el nuevo orden.")
      notifySuccess(successTitle, "El orden ya quedo persistido.")
      await mutate()
    } catch (reorderError) {
      notifyError("No se pudo guardar el orden", reorderError instanceof Error ? reorderError.message : "Se recargara el catalogo.")
      await mutate()
    }
  }

  const handleCategoryDrop = async (overId: string) => {
    if (!draggedCategoryId || draggedCategoryId === overId || reorderingCategories) return
    const moved = moveItem(sortedCategories, draggedCategoryId, overId)
    const ids = moved.map((item) => item.id)
    setCatalog((current) => (current ? { ...current, categories: applySortOrder(current.categories, ids) } : current))
    setDraggedCategoryId(null)
    setReorderingCategories(true)
    await persistReorder("category", ids, "Categorias reordenadas")
    setReorderingCategories(false)
  }

  const handleSectionDrop = async (overId: string) => {
    if (!draggedSectionId || draggedSectionId === overId || reorderingSections) return
    const moved = moveItem(activeSections, draggedSectionId, overId)
    const ids = moved.map((item) => item.id)
    setCatalog((current) => (current ? { ...current, sections: applySortOrder(current.sections, ids) } : current))
    setDraggedSectionId(null)
    setReorderingSections(true)
    await persistReorder("section", ids, "Subsecciones reordenadas")
    setReorderingSections(false)
  }

  const handleProductDrop = async (sectionId: string | null, overId: string) => {
    if (!draggedProductId || draggedProductId === overId || reorderingProducts) return
    const groupItems = sortMenuItems(
      activeProducts.filter((product) => (product.section_id || ROOT_SECTION_VALUE) === (sectionId || ROOT_SECTION_VALUE)),
    )
    const moved = moveItem(groupItems, draggedProductId, overId)
    const ids = moved.map((item) => item.id)
    setCatalog((current) => (current ? { ...current, products: applySortOrder(current.products, ids) } : current))
    setDraggedProductId(null)
    setReorderingProducts(true)
    await persistReorder("product", ids, "Productos reordenados")
    setReorderingProducts(false)
  }

  const setFeaturedProduct = async (productId: string | null) => {
    if (!activeCategory || updatingFeatured) return
    setCatalog((current) =>
      current
        ? {
            ...current,
            products: current.products.map((product) =>
              product.category_id !== activeCategory.id
                ? product
                : { ...product, is_featured: productId ? product.id === productId : false },
            ),
          }
        : current,
    )
    setUpdatingFeatured(true)
    try {
      const response = await fetch("/api/menu/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: activeCategory.id, productId }),
      })
      await requestJson(response, "No se pudo actualizar el destacado manual.")
      notifySuccess(productId ? "Producto destacado actualizado" : "Destacado retirado")
      await mutate()
    } catch (featureError) {
      notifyError("No se pudo actualizar el destacado", featureError instanceof Error ? featureError.message : "Se recargara la informacion.")
      await mutate()
    } finally {
      setDraggedProductId(null)
      setUpdatingFeatured(false)
    }
  }

  if (isLoading && !catalog) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando menu web...
        </div>
      </div>
    )
  }

  if (error && !catalog) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">{error.message}</CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Menu Web</h1>
            <p className="text-sm text-muted-foreground">
              Primero ves el menu como quedaria y desde ahi mismo reorganizas, editas y destacas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeCategory ? (
              <Button variant="outline" onClick={() => setSelectedCategoryId(null)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a categorias
              </Button>
            ) : null}
            <Button onClick={openNewCategoryDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva categoria
            </Button>
          </div>
        </div>

        {!activeCategory ? (
          <div className="grid gap-6">
            <div className="mx-auto w-full max-w-[410px] rounded-[2.25rem] border border-primary/20 bg-[linear-gradient(180deg,#ffffff_0%,#fcf7ff_100%)] p-4 shadow-[0_34px_90px_-60px_rgba(159,31,238,0.55)] sm:p-6">
              <div className="space-y-3">
                {sortedCategories.length === 0 ? (
                  <div className="rounded-[2rem] border border-dashed border-primary/30 px-5 py-10 text-center text-sm text-muted-foreground">
                    No hay categorias todavia. Crea la primera para empezar.
                  </div>
                ) : (
                  sortedCategories.map((category) => {
                    const Icon = menuIconMap[category.icon_key] || UtensilsCrossed
                    return (
                      <div
                        key={category.id}
                        draggable
                        onDragStart={() => setDraggedCategoryId(category.id)}
                        onDragEnd={() => setDraggedCategoryId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => void handleCategoryDrop(category.id)}
                        className={cn(
                          "group flex items-center gap-3 rounded-full border border-primary/25 bg-white/95 px-4 py-4 shadow-sm",
                          draggedCategoryId === category.id && "opacity-80",
                        )}
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-primary/70" />
                        <button type="button" onClick={() => setSelectedCategoryId(category.id)} className="flex flex-1 items-center gap-3 text-left">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-lg font-semibold text-foreground">{category.title}</span>
                        </button>
                        <div className="flex gap-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditCategoryDialog(category)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => void deleteCategory(category)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
            <div className="w-full max-w-[430px] space-y-6 xl:max-w-none">
              <div className="rounded-[2.25rem] border border-primary/20 bg-[linear-gradient(180deg,#ffffff_0%,#fcf7ff_100%)] p-4 shadow-[0_34px_90px_-60px_rgba(159,31,238,0.55)] sm:p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Button variant="outline" className="rounded-full border-primary/25 text-primary" onClick={() => setSelectedCategoryId(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Categorias
                  </Button>
                  <Button variant="outline" className="rounded-full border-primary/25 text-primary" onClick={() => openEditCategoryDialog(activeCategory)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar categoria
                  </Button>
                  <Button className="rounded-full" onClick={openNewSectionDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva subseccion
                  </Button>
                  <Button className="rounded-full" onClick={() => openNewProductDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo producto
                  </Button>
                </div>

                <PreviewMedia src={activeCategory.banner_image_url} alt={activeCategory.title} ratio="banner" />
                <div className="mt-5 text-center">
                  <p className="text-2xl font-semibold text-primary sm:text-3xl">{activeCategory.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{activeCategory.blurb || "Sin descripcion breve todavia."}</p>
                </div>
              </div>

              <Card className="border-primary/15">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Subsecciones</CardTitle>
                    <Button variant="outline" size="sm" onClick={openNewSectionDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {activeSections.length === 0 ? (
                      <div className="w-full rounded-2xl border border-dashed border-primary/25 px-4 py-6 text-center text-sm text-muted-foreground">
                        No hay subsecciones. Puedes trabajar directo sobre la categoria o crear una nueva.
                      </div>
                    ) : (
                      activeSections.map((section) => (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={() => setDraggedSectionId(section.id)}
                          onDragEnd={() => setDraggedSectionId(null)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => void handleSectionDrop(section.id)}
                          className={cn(
                            "group flex items-center gap-2 rounded-full border border-primary/25 bg-white px-4 py-3 text-sm shadow-sm",
                            draggedSectionId === section.id && "opacity-80",
                          )}
                        >
                          <GripVertical className="h-4 w-4 text-primary/70" />
                          <span className="font-semibold text-foreground">{section.title}</span>
                          <div className="flex gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEditSectionDialog(section)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => void deleteSection(section)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/15">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Producto destacado manual</CardTitle>
                    {featuredProduct ? (
                      <Button variant="outline" size="sm" onClick={() => void setFeaturedProduct(null)} disabled={updatingFeatured}>
                        Quitar destacado
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void setFeaturedProduct(draggedProductId)}
                    className={cn(
                      "rounded-[1.75rem] border border-dashed border-primary/30 bg-[linear-gradient(180deg,#ffffff_0%,#fbf5ff_100%)] p-4",
                      draggedProductId && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Producto destacado
                    </span>

                    {featuredProduct ? (
                      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                        <PreviewMedia src={featuredProduct.image_url} alt={featuredProduct.title} className="w-full sm:w-36" />
                        <div className="flex-1">
                          <p className="text-2xl font-semibold text-foreground">{featuredProduct.title}</p>
                          <p className="mt-2 text-sm text-muted-foreground">{featuredProduct.description || "Sin descripcion."}</p>
                          <p className="mt-3 text-3xl font-bold text-primary">{formatPriceCop(featuredProduct.price_cop)}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-white/80 px-4 py-6 text-sm text-muted-foreground">
                        Arrastra aqui el producto que quieras destacar. Desde ahora el destacado ya no depende de clics del cliente.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/15">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>Productos de la categoria</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => openNewProductDialog(null)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar a categoria
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rootProducts.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-primary/25 px-4 py-6 text-center text-sm text-muted-foreground">
                      Esta categoria no tiene productos directos todavia.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {rootProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          draggedProductId={draggedProductId}
                          onDragStart={setDraggedProductId}
                          onDragEnd={() => setDraggedProductId(null)}
                          onDrop={(targetId) => void handleProductDrop(null, targetId)}
                          onEdit={openEditProductDialog}
                          onDelete={(item) => void deleteProduct(item)}
                          onFeature={(id) => void setFeaturedProduct(id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {groupedSectionProducts.map(({ section, products: sectionProducts }) => (
                <Card key={section.id} className="border-primary/15">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle>{section.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">Productos asociados a esta subseccion.</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openNewProductDialog(section.id)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar producto
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sectionProducts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-primary/25 px-4 py-6 text-center text-sm text-muted-foreground">
                        Esta subseccion no tiene productos todavia.
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {sectionProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            draggedProductId={draggedProductId}
                            onDragStart={setDraggedProductId}
                            onDragEnd={() => setDraggedProductId(null)}
                            onDrop={(targetId) => void handleProductDrop(section.id, targetId)}
                            onEdit={openEditProductDialog}
                            onDelete={(item) => void deleteProduct(item)}
                            onFeature={(id) => void setFeaturedProduct(id)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid content-start gap-4 xl:w-[300px] xl:justify-self-start">
              <Card className="self-start gap-4 border-primary/15 py-4">
                <CardHeader className="px-6 pb-1">
                  <CardTitle className="text-base">Configuracion rapida</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 px-6">
                  <Button
                    size="sm"
                    className="h-auto min-h-0 justify-start rounded-xl px-5 py-2.5"
                    onClick={() => openEditCategoryDialog(activeCategory)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-0 justify-start rounded-xl px-5 py-2.5"
                    onClick={openNewSectionDialog}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Subseccion
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-0 justify-start rounded-xl px-5 py-2.5"
                    onClick={() => openNewProductDialog()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Producto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-0 justify-start rounded-xl px-5 py-2.5"
                    onClick={() => void deleteCategory(activeCategory)}
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Eliminar
                  </Button>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategoryId ? "Editar categoria" : "Nueva categoria"}</DialogTitle>
            <DialogDescription>Actualiza titulo, icono, descripcion y banner sin salir del flujo visual del menu.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={saveCategory}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-title">Titulo</Label>
                <Input id="category-title" value={categoryForm.title} onChange={(event) => setCategoryForm((current) => ({ ...current, title: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Icono</Label>
                <Select value={categoryForm.icon_key} onValueChange={(value) => setCategoryForm((current) => ({ ...current, icon_key: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MENU_ICON_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-blurb">Descripcion breve</Label>
              <Textarea id="category-blurb" rows={3} value={categoryForm.blurb} onChange={(event) => setCategoryForm((current) => ({ ...current, blurb: event.target.value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="category-order">Orden</Label>
                <Input id="category-order" type="number" value={categoryForm.sort_order} onChange={(event) => setCategoryForm((current) => ({ ...current, sort_order: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Banner</Label>
                <Input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleBannerUpload(file) }} />
                {uploadingBanner ? <p className="text-xs text-muted-foreground">Subiendo banner...</p> : null}
                <PreviewMedia src={categoryForm.banner_image_url} alt="Banner de categoria" ratio="banner" className="min-h-[180px]" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingCategory || uploadingBanner}>
                {savingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingCategoryId ? "Guardar cambios" : "Crear categoria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSectionId ? "Editar subseccion" : "Nueva subseccion"}</DialogTitle>
            <DialogDescription>Se guardara dentro de {activeCategory?.title || "la categoria activa"}.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={saveSection}>
            <div className="space-y-2">
              <Label htmlFor="section-title">Titulo</Label>
              <Input id="section-title" value={sectionForm.title} onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-order">Orden</Label>
              <Input id="section-order" type="number" value={sectionForm.sort_order} onChange={(event) => setSectionForm((current) => ({ ...current, sort_order: event.target.value }))} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingSection || !activeCategory}>
                {savingSection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingSectionId ? "Guardar subseccion" : "Crear subseccion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProductId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            <DialogDescription>Carga imagen, descripcion, precio y define su subseccion.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={saveProduct}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Subseccion</Label>
                <Select value={productForm.section_id} onValueChange={(value) => setProductForm((current) => ({ ...current, section_id: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROOT_SECTION_VALUE}>Categoria principal</SelectItem>
                    {activeSections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>{section.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-order">Orden</Label>
                <Input id="product-order" type="number" value={productForm.sort_order} onChange={(event) => setProductForm((current) => ({ ...current, sort_order: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-title">Titulo</Label>
              <Input id="product-title" value={productForm.title} onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))} required />
            </div>

            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="product-price">Precio</Label>
                <Input id="product-price" type="number" min={0} step={100} value={productForm.price_cop} onChange={(event) => setProductForm((current) => ({ ...current, price_cop: event.target.value }))} required />
                <p className="text-xs text-muted-foreground">Vista previa: {formatPriceCop(Number(productForm.price_cop || 0))}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-description">Descripcion</Label>
                <Textarea id="product-description" rows={4} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagen del producto</Label>
              <Input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleProductImageUpload(file) }} />
              {uploadingProductImage ? <p className="text-xs text-muted-foreground">Subiendo imagen...</p> : null}
              <PreviewMedia src={productForm.image_url} alt="Imagen del producto" className="max-w-xs" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingProduct || uploadingProductImage || !activeCategory}>
                {savingProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingProductId ? "Guardar producto" : "Crear producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
