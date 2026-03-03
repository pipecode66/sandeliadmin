"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
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

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    address: "",
    gender: "",
    comment: "",
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al registrar el cliente.")
        return
      }

      router.push(`/admin/clients/${data.client.id}`)
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle>Registrar nuevo cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="full_name">Nombre y apellido</Label>
                <Input
                  id="full_name"
                  placeholder="Juan Pérez"
                  value={form.full_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, full_name: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Número de teléfono</Label>
                <Input
                  id="phone"
                  placeholder="573001234567"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Calle 123 #45-67, Ciudad"
                  value={form.address}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, address: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Sexo</Label>
                <Select
                  value={form.gender}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, gender: value }))
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="comment">Comentario inicial (opcional)</Label>
                <Textarea
                  id="comment"
                  value={form.comment}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, comment: event.target.value }))
                  }
                  placeholder="Observación sobre el alta del cliente"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading || !form.gender}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar cliente
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
