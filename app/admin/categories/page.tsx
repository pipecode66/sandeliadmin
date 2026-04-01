"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((response) => response.json())

type Category = {
  id: string
  name: string
  products?: { count: number }[]
}

export default function CategoriesPage() {
  const { data, mutate } = useSWR<{ categories: Category[] }>("/api/categories", fetcher, {
    refreshInterval: 20000,
  })

  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const categories = data?.categories || []

  const resetForm = () => {
    setEditing(null)
    setName("")
    setError("")
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      const payload = {
        name: name.trim(),
      }
      const endpoint = editing ? `/api/categories/${editing.id}` : "/api/categories"
      const method = editing ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "No se pudo guardar la categoría.")
        return
      }

      resetForm()
      mutate()
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  const onEdit = (category: Category) => {
    setEditing(category)
    setName(category.name)
    setError("")
  }

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("¿Eliminar categoría?")
    if (!confirmed) return
    const response = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    const result = await response.json()
    if (!response.ok) {
      setError(result.error || "No se pudo eliminar la categoría.")
      return
    }
    mutate()
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categorías</h1>
          <p className="text-sm text-muted-foreground">
            Administra las categorías que agrupan los productos redimibles.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar categoría" : "Nueva categoría"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej: Snacks"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Los puntos ahora se asignan por producto. Esta sección solo organiza el catálogo.
              </p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {editing ? "Guardar cambios" : "Agregar categoría"}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin categorías.</p>
            ) : (
              categories.map((category) => {
                const productCount = category.products?.[0]?.count || 0
                return (
                  <div
                    key={category.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{productCount} productos</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(category)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(category.id)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
