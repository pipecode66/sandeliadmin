"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Loader2, Pencil, Save, UserPlus, X } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type AdminUser = {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  role: "super_admin" | "gerente" | "supervisor" | "caja"
  is_active: boolean
  created_at: string
}

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super admin" },
  { value: "gerente", label: "Gerente" },
  { value: "supervisor", label: "Supervisor" },
  { value: "caja", label: "Caja" },
] as const

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la información.")
  }
  return data
}

export default function AdminUsersPage() {
  const { data, error, isLoading, mutate } = useSWR<{ users: AdminUser[] }>(
    "/api/admin-users",
    fetcher,
    {
      refreshInterval: 20000,
    },
  )
  const { data: meData } = useSWR<{ admin?: { id?: string; role?: string } }>(
    "/api/auth/admin/me",
    fetcher,
    { refreshInterval: 30000 },
  )

  const isSuperAdmin = meData?.admin?.role === "super_admin"

  const [creating, setCreating] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(
    null,
  )

  const [createForm, setCreateForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "caja",
    is_active: true,
    comment: "",
  })

  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "caja",
    is_active: true,
    comment: "",
  })

  const users = useMemo(() => data?.users || [], [data?.users])

  const resetCreateForm = () => {
    setCreateForm({
      full_name: "",
      email: "",
      password: "",
      role: "caja",
      is_active: true,
      comment: "",
    })
  }

  const beginEdit = (user: AdminUser) => {
    setEditingUserId(user.id)
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
      comment: "",
    })
    setFeedback(null)
  }

  const cancelEdit = () => {
    setEditingUserId(null)
    setEditForm({
      full_name: "",
      email: "",
      password: "",
      role: "caja",
      is_active: true,
      comment: "",
    })
  }

  const onCreateUser = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isSuperAdmin) return

    setCreating(true)
    setFeedback(null)
    try {
      const response = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })
      const result = await response.json()

      if (!response.ok) {
        setFeedback({ type: "error", message: result.error || "No se pudo crear el usuario." })
        return
      }

      resetCreateForm()
      setFeedback({ type: "ok", message: "Usuario administrativo creado correctamente." })
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setCreating(false)
    }
  }

  const onSaveUser = async (id: string) => {
    if (!isSuperAdmin) return
    setSavingId(id)
    setFeedback(null)

    try {
      const response = await fetch(`/api/admin-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })
      const result = await response.json()
      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result.error || "No se pudo actualizar el usuario.",
        })
        return
      }

      setFeedback({ type: "ok", message: "Usuario actualizado correctamente." })
      cancelEdit()
      await mutate()
    } catch {
      setFeedback({ type: "error", message: "Error de conexión." })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios jerárquicos</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona accesos por rango de empresa: super admin, gerente, supervisor y caja.
          </p>
        </div>

        {!isSuperAdmin && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-3 text-sm text-amber-700">
              Solo el rol <strong>Super admin</strong> puede crear y editar usuarios administrativos.
            </CardContent>
          </Card>
        )}

        {feedback && (
          <Card
            className={
              feedback.type === "ok"
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }
          >
            <CardContent
              className={feedback.type === "ok" ? "py-3 text-sm text-emerald-700" : "py-3 text-sm text-red-700"}
            >
              {feedback.message}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Crear usuario administrativo</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid grid-cols-1 gap-3 lg:grid-cols-2" onSubmit={onCreateUser}>
              <div className="space-y-1">
                <Label htmlFor="new-full-name">Nombre completo</Label>
                <Input
                  id="new-full-name"
                  value={createForm.full_name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, full_name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-email">Correo</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-password">Contraseña inicial</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, password: event.target.value }))
                  }
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Rol</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({ ...current, role: value as AdminUser["role"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 lg:col-span-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Usuario activo</p>
                  <p className="text-xs text-muted-foreground">
                    Si está desactivado no podrá iniciar sesión en el panel.
                  </p>
                </div>
                <Switch
                  checked={createForm.is_active}
                  onCheckedChange={(value) =>
                    setCreateForm((current) => ({ ...current, is_active: value }))
                  }
                />
              </div>

              <div className="space-y-1 lg:col-span-2">
                <Label htmlFor="new-comment">Comentario de creación</Label>
                <Textarea
                  id="new-comment"
                  value={createForm.comment}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, comment: event.target.value }))
                  }
                  placeholder="Motivo o contexto del alta del usuario"
                />
              </div>

              <div className="lg:col-span-2">
                <Button
                  type="submit"
                  disabled={
                    !isSuperAdmin ||
                    creating ||
                    !createForm.full_name.trim() ||
                    !createForm.email.trim() ||
                    !createForm.password
                  }
                >
                  {creating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Crear usuario
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado de usuarios administrativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error.message}</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
            ) : (
              users.map((user) => {
                const isEditing = editingUserId === user.id
                const savingThis = savingId === user.id

                return (
                  <div key={user.id} className="rounded-lg border p-3">
                    {isEditing ? (
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Nombre completo</Label>
                          <Input
                            value={editForm.full_name}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, full_name: event.target.value }))
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <Label>Correo</Label>
                          <Input
                            type="email"
                            value={editForm.email}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, email: event.target.value }))
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <Label>Rol</Label>
                          <Select
                            value={editForm.role}
                            onValueChange={(value) =>
                              setEditForm((current) => ({
                                ...current,
                                role: value as AdminUser["role"],
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Nueva contraseña (opcional)</Label>
                          <Input
                            type="password"
                            value={editForm.password}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, password: event.target.value }))
                            }
                            placeholder="Solo si deseas reemplazarla"
                          />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-3 lg:col-span-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">Usuario activo</p>
                            <p className="text-xs text-muted-foreground">
                              Controla si puede ingresar al panel.
                            </p>
                          </div>
                          <Switch
                            checked={editForm.is_active}
                            onCheckedChange={(value) =>
                              setEditForm((current) => ({ ...current, is_active: value }))
                            }
                          />
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                          <Label>Comentario de edición</Label>
                          <Textarea
                            value={editForm.comment}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, comment: event.target.value }))
                            }
                            placeholder="Describe el motivo del cambio"
                          />
                        </div>

                        <div className="flex gap-2 lg:col-span-2">
                          <Button
                            onClick={() => onSaveUser(user.id)}
                            disabled={!isSuperAdmin || savingThis}
                          >
                            {savingThis ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            Guardar
                          </Button>
                          <Button type="button" variant="outline" onClick={cancelEdit}>
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Rol: {ROLE_OPTIONS.find((option) => option.value === user.role)?.label || user.role}
                            {" · "}
                            {user.is_active ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString("es-CO")}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => beginEdit(user)}
                            disabled={!isSuperAdmin}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    )}
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
