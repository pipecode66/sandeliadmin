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

const MONTH_OPTIONS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1))

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
    birthday_month: "",
    birthday_day: "",
    comment: "",
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      const payload = {
        ...form,
        birthday_month: form.birthday_month || null,
        birthday_day: form.birthday_day || null,
      }

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al registrar el cliente.")
        return
      }

      router.push(`/admin/clients/${data.client.id}`)
    } catch {
      setError("Error de conexion.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Registrar nuevo cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <Label htmlFor="full_name">Nombre y apellido</Label>
                  <Input
                    id="full_name"
                    placeholder="Juan Perez"
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, full_name: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Correo electronico</Label>
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
                  <Label htmlFor="phone">Numero de telefono</Label>
                  <Input
                    id="phone"
                    placeholder="3001234567"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                    required
                  />
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <Label htmlFor="address">Direccion</Label>
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
                  <Label>Mes de cumpleanos (opcional)</Label>
                  <Select
                    value={form.birthday_month}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, birthday_month: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Dia de cumpleanos (opcional)</Label>
                  <Select
                    value={form.birthday_day}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, birthday_day: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_OPTIONS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2 md:col-span-2">
                  <Label htmlFor="comment">Comentario inicial (opcional)</Label>
                  <Textarea
                    id="comment"
                    value={form.comment}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, comment: event.target.value }))
                    }
                    placeholder="Observacion sobre el alta del cliente"
                  />
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full md:w-auto" disabled={loading || !form.gender}>
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
