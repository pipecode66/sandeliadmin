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
  daily_limit_override?: boolean
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || "No se pudo cargar la información.")
  }
  return data
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
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona clientes, puntos y límites del programa de fidelización.
            </p>
          </div>
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo cliente
            </Button>
          </Link>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o teléfono..."
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Nombre
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground md:table-cell">
                      Correo
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground sm:table-cell">
                      Teléfono
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                      Puntos
                    </th>
                    <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground lg:table-cell">
                      Límite
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Cargando...
                      </td>
                    </tr>
                  ) : clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No hay clientes registrados.
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b border-border last:border-0 hover:bg-secondary/50"
                      >
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{client.email}</p>
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                          {client.email}
                        </td>
                        <td className="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
                          {client.phone}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                            {client.points} pts
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-center lg:table-cell">
                          {client.daily_limit_override ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                              Excedido
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                              Normal
                            </span>
                          )}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  )
}
