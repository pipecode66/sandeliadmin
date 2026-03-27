"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react"
import { uploadAdminFile } from "@/lib/admin-upload"
import Image from "next/image"
import { useMemo, useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Category = { id: string; name: string; points_cost: number }
type Product = {
  id: string
  name: string
  description: string
  image_url: string | null
  category_id: string
  points_cost: number
  categories?: { name?: string; points_cost?: number }
}

export default function ProductsPage() {
  const { data: productsData, mutate: mutateProducts } = useSWR<{ products: Product[] }>(
    "/api/products",
    fetcher,
    { refreshInterval: 15000 },
  )
  const { data: categoriesData } = useSWR<{ categories: Category[] }>(
    "/api/categories",
    fetcher,
    { refreshInterval: 30000 },
  )

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    category_id: "",
    image_url: "",
  })

  const categories = categoriesData?.categories || []
  const products = productsData?.products || []
  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === form.category_id),
    [categories, form.category_id],
  )

  const resetForm = () => {
    setEditing(null)
    setForm({ name: "", description: "", category_id: "", image_url: "" })
    setError("")
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setError("")
    try {
      const url = await uploadAdminFile(file, "products")
      setForm((current) => ({ ...current, image_url: url }))
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error de conexión subiendo imagen.")
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category_id: form.category_id,
        image_url: form.image_url || null,
      }

      const endpoint = editing ? `/api/products/${editing.id}` : "/api/products"
      const method = editing ? "PATCH" : "POST"
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || "No se pudo guardar el producto.")
        return
      }
      resetForm()
      mutateProducts()
    } catch {
      setError("Error de conexión al guardar.")
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (product: Product) => {
    setEditing(product)
    setError("")
    setForm({
      name: product.name,
      description: product.description || "",
      category_id: product.category_id,
      image_url: product.image_url || "",
    })
  }

  const onDelete = async (productId: string) => {
    const confirmed = window.confirm("Esta acción eliminará el producto. ¿Deseas continuar?")
    if (!confirmed) return

    const response = await fetch(`/api/products/${productId}`, { method: "DELETE" })
    if (response.ok) mutateProducts()
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Agrega, edita o elimina productos redimibles del menú.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => setForm((cur) => ({ ...cur, name: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm((cur) => ({ ...cur, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name} ({category.points_cost} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="description">Detalles</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((cur) => ({ ...cur, description: event.target.value }))
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label>Foto del producto</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) onUpload(file)
                    }}
                  />
                </div>
                {uploading && (
                  <p className="text-sm text-muted-foreground">
                    <Upload className="mr-1 inline h-4 w-4" />
                    Subiendo imagen...
                  </p>
                )}
                {form.image_url && (
                  <div className="relative h-36 w-36 overflow-hidden rounded-lg border">
                    <Image
                      src={form.image_url}
                      alt="Preview producto"
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                  </div>
                )}
              </div>

              {selectedCategory && (
                <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary lg:col-span-2">
                  Este producto descontará {selectedCategory.points_cost} puntos al cliente.
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive lg:col-span-2">{error}</p>
              )}

              <div className="flex gap-2 lg:col-span-2">
                <Button
                  type="submit"
                  disabled={saving || uploading || !form.category_id}
                  className="min-w-36"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Guardar Cambios" : "Crear Producto"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar edición
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Listado de Productos</span>
              <span className="text-sm font-normal text-muted-foreground">{products.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                >
                  <div className="relative h-20 w-20 overflow-hidden rounded-md bg-secondary">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.description}</p>
                    <p className="text-xs text-primary">
                      {product.categories?.name || "Sin categoría"} ·{" "}
                      {product.categories?.points_cost ?? product.points_cost} pts
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(product.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}




