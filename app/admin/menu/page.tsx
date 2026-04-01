"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2, Pencil, Trash2, Upload } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { uploadAdminFile } from "@/lib/admin-upload"
import { formatPriceCop, MENU_ICON_OPTIONS } from "@/lib/menu-catalog"

type MenuCategory = {
  id: string
  title: string
  blurb: string
  icon_key: string
  banner_image_url: string | null
  sort_order: number
}

type MenuSection = {
  id: string
  category_id: string
  title: string
  sort_order: number
}

type MenuProduct = {
  id: string
  category_id: string
  section_id: string | null
  title: string
  description: string
  price_cop: number
  image_url: string | null
  sort_order: number
}

type MenuCatalogResponse = {
  categories: MenuCategory[]
  sections: MenuSection[]
  products: MenuProduct[]
}

type Feedback = { type: "ok" | "error"; message: string } | null

const ROOT_SECTION_VALUE = "__root__"
const ALL_CATEGORIES_VALUE = "__all__"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar el menu web.")
  }
  return data as MenuCatalogResponse
}

const emptyCategoryForm = {
  title: "",
  blurb: "",
  icon_key: "utensils",
  banner_image_url: "",
  sort_order: "0",
}

const emptySectionForm = {
  category_id: "",
  title: "",
  sort_order: "0",
}

const emptyProductForm = {
  category_id: "",
  section_id: ROOT_SECTION_VALUE,
  title: "",
  description: "",
  price_cop: "",
  image_url: "",
  sort_order: "0",
}

export default function MenuManagementPage() {
  const { data, error, isLoading, mutate } = useSWR<MenuCatalogResponse>("/api/menu/catalog", fetcher, {
    refreshInterval: 20000,
  })

  const categories = data?.categories || []
  const sections = data?.sections || []
  const products = data?.products || []

  const [feedback, setFeedback] = useState<Feedback>(null)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [sectionForm, setSectionForm] = useState(emptySectionForm)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)
  const [savingSection, setSavingSection] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [uploadingProductImage, setUploadingProductImage] = useState(false)
  const [activeSectionCategoryFilter, setActiveSectionCategoryFilter] = useState(ALL_CATEGORIES_VALUE)
  const [activeProductCategoryFilter, setActiveProductCategoryFilter] = useState(ALL_CATEGORIES_VALUE)

  useEffect(() => {
    if (
      activeSectionCategoryFilter !== ALL_CATEGORIES_VALUE &&
      categories.some((item) => item.id === activeSectionCategoryFilter)
    ) {
      return
    }
    if (activeSectionCategoryFilter === ALL_CATEGORIES_VALUE) return
    setActiveSectionCategoryFilter(ALL_CATEGORIES_VALUE)
  }, [activeSectionCategoryFilter, categories])

  useEffect(() => {
    if (
      activeProductCategoryFilter !== ALL_CATEGORIES_VALUE &&
      categories.some((item) => item.id === activeProductCategoryFilter)
    ) {
      return
    }
    if (activeProductCategoryFilter === ALL_CATEGORIES_VALUE) return
    setActiveProductCategoryFilter(ALL_CATEGORIES_VALUE)
  }, [activeProductCategoryFilter, categories])

  useEffect(() => {
    if (sectionForm.category_id) return
    if (categories.length === 0) return
    setSectionForm((current) => ({ ...current, category_id: categories[0].id }))
  }, [categories, sectionForm.category_id])

  useEffect(() => {
    if (productForm.category_id) return
    if (categories.length === 0) return
    setProductForm((current) => ({ ...current, category_id: categories[0].id }))
  }, [categories, productForm.category_id])

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  )

  const sectionMap = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  )

  const filteredSections = useMemo(() => {
    if (activeSectionCategoryFilter === ALL_CATEGORIES_VALUE) return sections
    return sections.filter((section) => section.category_id === activeSectionCategoryFilter)
  }, [activeSectionCategoryFilter, sections])

  const filteredProducts = useMemo(() => {
    if (activeProductCategoryFilter === ALL_CATEGORIES_VALUE) return products
    return products.filter((product) => product.category_id === activeProductCategoryFilter)
  }, [activeProductCategoryFilter, products])

  const sectionOptionsForProduct = useMemo(
    () => sections.filter((section) => section.category_id === productForm.category_id),
    [productForm.category_id, sections],
  )

  const resetCategoryForm = () => {
    setEditingCategoryId(null)
    setCategoryForm(emptyCategoryForm)
  }

  const resetSectionForm = () => {
    setEditingSectionId(null)
    setSectionForm({ ...emptySectionForm, category_id: categories[0]?.id || "" })
  }

  const resetProductForm = () => {
    setEditingProductId(null)
    setProductForm({ ...emptyProductForm, category_id: categories[0]?.id || "" })
  }

  const showRequestResult = async (response: Response, fallback: string) => {
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setFeedback({ type: "error", message: result.error || fallback })
      return false
    }
    return true
  }

  const handleBannerUpload = async (file: File) => {
    setUploadingBanner(true)
    setFeedback(null)
    try {
      const url = await uploadAdminFile(file, "menu-category-banners")
      setCategoryForm((current) => ({ ...current, banner_image_url: url }))
    } catch (uploadError) {
      setFeedback({
        type: "error",
        message: uploadError instanceof Error ? uploadError.message : "No se pudo subir el banner.",
      })
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleProductImageUpload = async (file: File) => {
    setUploadingProductImage(true)
    setFeedback(null)
    try {
      const url = await uploadAdminFile(file, "menu-products")
      setProductForm((current) => ({ ...current, image_url: url }))
    } catch (uploadError) {
      setFeedback({
        type: "error",
        message: uploadError instanceof Error ? uploadError.message : "No se pudo subir la imagen.",
      })
    } finally {
      setUploadingProductImage(false)
    }
  }

  const submitCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingCategory(true)
    setFeedback(null)

    try {
      const response = await fetch(
        editingCategoryId ? `/api/menu/categories/${editingCategoryId}` : "/api/menu/categories",
        {
          method: editingCategoryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...categoryForm,
            sort_order: Number(categoryForm.sort_order || 0),
            banner_image_url: categoryForm.banner_image_url || null,
          }),
        },
      )

      if (!(await showRequestResult(response, "No se pudo guardar la categoria."))) return
      setFeedback({
        type: "ok",
        message: editingCategoryId ? "Categoria actualizada." : "Categoria creada.",
      })
      resetCategoryForm()
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexion guardando la categoria." })
    } finally {
      setSavingCategory(false)
    }
  }

  const submitSection = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingSection(true)
    setFeedback(null)

    try {
      const response = await fetch(
        editingSectionId ? `/api/menu/sections/${editingSectionId}` : "/api/menu/sections",
        {
          method: editingSectionId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...sectionForm,
            sort_order: Number(sectionForm.sort_order || 0),
          }),
        },
      )

      if (!(await showRequestResult(response, "No se pudo guardar la subseccion."))) return
      setFeedback({
        type: "ok",
        message: editingSectionId ? "Subseccion actualizada." : "Subseccion creada.",
      })
      resetSectionForm()
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexion guardando la subseccion." })
    } finally {
      setSavingSection(false)
    }
  }

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingProduct(true)
    setFeedback(null)

    try {
      const response = await fetch(
        editingProductId ? `/api/menu/products/${editingProductId}` : "/api/menu/products",
        {
          method: editingProductId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...productForm,
            section_id: productForm.section_id === ROOT_SECTION_VALUE ? null : productForm.section_id,
            price_cop: Number(productForm.price_cop || 0),
            sort_order: Number(productForm.sort_order || 0),
            image_url: productForm.image_url || null,
          }),
        },
      )

      if (!(await showRequestResult(response, "No se pudo guardar el producto."))) return
      setFeedback({
        type: "ok",
        message: editingProductId ? "Producto actualizado." : "Producto creado.",
      })
      resetProductForm()
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexion guardando el producto." })
    } finally {
      setSavingProduct(false)
    }
  }

  const editCategory = (category: MenuCategory) => {
    setEditingCategoryId(category.id)
    setCategoryForm({
      title: category.title,
      blurb: category.blurb || "",
      icon_key: category.icon_key || "utensils",
      banner_image_url: category.banner_image_url || "",
      sort_order: String(category.sort_order ?? 0),
    })
  }

  const editSection = (section: MenuSection) => {
    setEditingSectionId(section.id)
    setSectionForm({
      category_id: section.category_id,
      title: section.title,
      sort_order: String(section.sort_order ?? 0),
    })
  }

  const editProduct = (product: MenuProduct) => {
    setEditingProductId(product.id)
    setProductForm({
      category_id: product.category_id,
      section_id: product.section_id || ROOT_SECTION_VALUE,
      title: product.title,
      description: product.description || "",
      price_cop: String(product.price_cop ?? 0),
      image_url: product.image_url || "",
      sort_order: String(product.sort_order ?? 0),
    })
  }

  const deleteCategory = async (category: MenuCategory) => {
    const confirmed = window.confirm(
      `Eliminar la categoria \"${category.title}\" tambien borrara sus subsecciones y productos.`,
    )
    if (!confirmed) return

    const response = await fetch(`/api/menu/categories/${category.id}`, { method: "DELETE" })
    if (!(await showRequestResult(response, "No se pudo eliminar la categoria."))) return
    setFeedback({ type: "ok", message: "Categoria eliminada." })
    if (editingCategoryId === category.id) resetCategoryForm()
    await mutate()
  }

  const deleteSection = async (section: MenuSection) => {
    const confirmed = window.confirm(
      `Eliminar la subseccion \"${section.title}\" dejara sus productos en la categoria principal.`,
    )
    if (!confirmed) return

    const response = await fetch(`/api/menu/sections/${section.id}`, { method: "DELETE" })
    if (!(await showRequestResult(response, "No se pudo eliminar la subseccion."))) return
    setFeedback({ type: "ok", message: "Subseccion eliminada." })
    if (editingSectionId === section.id) resetSectionForm()
    await mutate()
  }

  const deleteProduct = async (product: MenuProduct) => {
    const confirmed = window.confirm(`Eliminar el producto \"${product.title}\"?`)
    if (!confirmed) return

    const response = await fetch(`/api/menu/products/${product.id}`, { method: "DELETE" })
    if (!(await showRequestResult(response, "No se pudo eliminar el producto."))) return
    setFeedback({ type: "ok", message: "Producto eliminado." })
    if (editingProductId === product.id) resetProductForm()
    await mutate()
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Menu web</h1>
            <p className="text-sm text-muted-foreground">
              Administra categorias, subsecciones, productos y banners de sandelimenuapp.
            </p>
          </div>
        </div>

        {feedback ? (
          <Card className={feedback.type === "ok" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
            <CardContent className={feedback.type === "ok" ? "py-3 text-sm text-emerald-700" : "py-3 text-sm text-red-700"}>
              {feedback.message}
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">{error.message}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingCategoryId ? "Editar categoria" : "Nueva categoria"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitCategory}>
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
                    <Label>Banner de categoria</Label>
                    <Input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleBannerUpload(file) }} />
                    {uploadingBanner ? <p className="text-xs text-muted-foreground">Subiendo banner...</p> : null}
                    {categoryForm.banner_image_url ? (
                      <div className="relative h-36 w-full overflow-hidden rounded-lg border bg-secondary">
                        <Image src={categoryForm.banner_image_url} alt="Banner de categoria" fill className="object-cover" sizes="(max-width: 768px) 100vw, 480px" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={savingCategory || uploadingBanner}>
                    {savingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingCategoryId ? "Guardar categoria" : "Crear categoria"}
                  </Button>
                  {editingCategoryId ? <Button type="button" variant="outline" onClick={resetCategoryForm}>Cancelar</Button> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Listado de categorias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Cargando categorias...</p> : null}
              {categories.length === 0 && !isLoading ? <p className="text-sm text-muted-foreground">No hay categorias registradas.</p> : null}
              {categories.map((category) => (
                <div key={category.id} className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{category.title}</p>
                      <p className="text-xs text-muted-foreground">{category.blurb || "Sin descripcion breve."}</p>
                      <p className="mt-1 text-xs text-primary">Icono: {MENU_ICON_OPTIONS.find((item) => item.value === category.icon_key)?.label || "General"} | Orden: {category.sort_order ?? 0}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editCategory(category)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteCategory(category)}><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button>
                    </div>
                  </div>
                  {category.banner_image_url ? (
                    <div className="relative h-28 overflow-hidden rounded-md border bg-secondary">
                      <Image src={category.banner_image_url} alt={category.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
                    </div>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingSectionId ? "Editar subseccion" : "Nueva subseccion"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitSection}>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={sectionForm.category_id} onValueChange={(value) => setSectionForm((current) => ({ ...current, category_id: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una categoria" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section-title">Titulo</Label>
                  <Input id="section-title" value={sectionForm.title} onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section-order">Orden</Label>
                  <Input id="section-order" type="number" value={sectionForm.sort_order} onChange={(event) => setSectionForm((current) => ({ ...current, sort_order: event.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={savingSection || categories.length === 0}>
                    {savingSection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingSectionId ? "Guardar subseccion" : "Crear subseccion"}
                  </Button>
                  {editingSectionId ? <Button type="button" variant="outline" onClick={resetSectionForm}>Cancelar</Button> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <CardTitle>Subsecciones</CardTitle>
                <div className="w-full md:max-w-xs space-y-2">
                  <Label>Filtrar subsecciones por categoria</Label>
                  <Select value={activeSectionCategoryFilter} onValueChange={setActiveSectionCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES_VALUE}>Todas las categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredSections.length === 0 ? <p className="text-sm text-muted-foreground">No hay subsecciones para este filtro.</p> : null}
              {filteredSections.map((section) => (
                <div key={section.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{section.title}</p>
                    <p className="text-xs text-muted-foreground">Categoria: {categoryMap.get(section.category_id)?.title || "Sin categoria"}</p>
                    <p className="text-xs text-primary">Orden: {section.sort_order ?? 0}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => editSection(section)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteSection(section)}><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>{editingProductId ? "Editar producto" : "Nuevo producto"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitProduct}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={productForm.category_id} onValueChange={(value) => setProductForm((current) => ({ ...current, category_id: value, section_id: ROOT_SECTION_VALUE }))}>
                      <SelectTrigger><SelectValue placeholder="Selecciona una categoria" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>{category.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subseccion</Label>
                    <Select value={productForm.section_id || ROOT_SECTION_VALUE} onValueChange={(value) => setProductForm((current) => ({ ...current, section_id: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ROOT_SECTION_VALUE}>Sin subseccion</SelectItem>
                        {sectionOptionsForProduct.map((section) => (
                          <SelectItem key={section.id} value={section.id}>{section.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-title">Titulo</Label>
                  <Input id="product-title" value={productForm.title} onChange={(event) => setProductForm((current) => ({ ...current, title: event.target.value }))} required />
                </div>

                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="product-price">Precio</Label>
                    <Input id="product-price" type="number" min={0} step={100} value={productForm.price_cop} onChange={(event) => setProductForm((current) => ({ ...current, price_cop: event.target.value }))} required />
                    <p className="text-xs text-muted-foreground">Vista previa: {formatPriceCop(Number(productForm.price_cop || 0))}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product-order">Orden</Label>
                    <Input id="product-order" type="number" value={productForm.sort_order} onChange={(event) => setProductForm((current) => ({ ...current, sort_order: event.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product-description">Descripcion</Label>
                  <Textarea id="product-description" rows={4} value={productForm.description} onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))} />
                </div>

                <div className="space-y-2">
                  <Label>Imagen del producto</Label>
                  <Input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) handleProductImageUpload(file) }} />
                  {uploadingProductImage ? <p className="text-xs text-muted-foreground">Subiendo imagen...</p> : null}
                  {productForm.image_url ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-secondary">
                      <Image src={productForm.image_url} alt="Imagen del producto" fill className="object-cover" sizes="(max-width: 768px) 100vw, 480px" />
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={savingProduct || uploadingProductImage || categories.length === 0}>
                    {savingProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingProductId ? "Guardar producto" : "Crear producto"}
                  </Button>
                  {editingProductId ? <Button type="button" variant="outline" onClick={resetProductForm}>Cancelar</Button> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <CardTitle>Productos</CardTitle>
                <div className="w-full md:max-w-xs space-y-2">
                  <Label>Filtrar productos por categoria</Label>
                  <Select value={activeProductCategoryFilter} onValueChange={setActiveProductCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES_VALUE}>Todas las categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredProducts.length === 0 ? <p className="text-sm text-muted-foreground">No hay productos para este filtro.</p> : null}
              {filteredProducts.map((product) => {
                const category = categoryMap.get(product.category_id)
                const section = product.section_id ? sectionMap.get(product.section_id) : null
                return (
                  <div key={product.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center">
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-secondary">
                      {product.image_url ? <Image src={product.image_url} alt={product.title} fill className="object-cover" sizes="96px" /> : null}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{product.title}</p>
                      <p className="text-xs text-muted-foreground">{product.description || "Sin descripcion."}</p>
                      <p className="mt-1 text-xs text-primary">{formatPriceCop(product.price_cop)} | {category?.title || "Sin categoria"}{section ? ` | ${section.title}` : " | Categoria raiz"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editProduct(product)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteProduct(product)}><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminShell>
  )
}
