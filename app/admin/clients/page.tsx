"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Eye, Plus, Search } from "lucide-react"
import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Client = {
  id: string
  full_name: string
  email: string
  phone: string
  points: number
  gender: string
  birthday_month?: number | null
  birthday_day?: number | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la informacion.")
  }
  return data
}

function formatBirthday(client: Client) {
  if (!client.birthday_month || !client.birthday_day) return "Sin fecha registrada"
  return `${String(client.birthday_day).padStart(2, "0")}/${String(client.birthday_month).padStart(2, "0")}`
}

export default function ClientsPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading, error } = useSWR<{ clients: Client[] }>(
    `/api/clients?search=${encodeURIComponent(search)}`,
    fetcher,
    { refreshInterval: 10000 },
  )

  const clients = data?.clients || []

  return (
    <AdminShell>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona clientes, puntos y datos clave del programa de fidelizacion.
            </p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Button>
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o telefono..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 text-sm text-red-700">{error.message}</CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Cargando...</div>
            ) : clients.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No hay clientes registrados.
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {clients.map((client) => (
                    <div key={client.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                        <Link href={`/admin/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalle</span>
                          </Button>
                        </Link>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground">{client.points} pts</p>
                          <p>Puntos</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{client.gender}</p>
                          <p>Sexo</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{formatBirthday(client)}</p>
                          <p>Cumpleanos</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                          Nombre
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                          Correo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                          Telefono
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                          Cumpleanos
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                          Puntos
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className="border-b border-border last:border-0 hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">{client.full_name}</p>
                            <p className="text-xs text-muted-foreground">{client.gender}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{client.email}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{client.phone}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatBirthday(client)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                              {client.points} pts
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/admin/clients/${client.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalle</span>
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
