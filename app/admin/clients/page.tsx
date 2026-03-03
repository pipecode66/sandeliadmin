"use client"

import { AdminShell } from "@/components/admin/admin-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Eye } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"
import { useState } from "react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function ClientsPage() {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useSWR(
    `/api/clients?search=${encodeURIComponent(search)}`,
    fetcher,
    { refreshInterval: 10000 }
  )

  const clients = data?.clients || []

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los clientes del programa de fidelizaci&oacute;n
            </p>
          </div>
          <Link href="/admin/clients/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o tel&eacute;fono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
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
                      Email
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground sm:table-cell">
                      Tel&eacute;fono
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                      Puntos
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                      Sexo
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
                        No hay clientes registrados
                      </td>
                    </tr>
                  ) : (
                    clients.map(
                      (client: {
                        id: string
                        full_name: string
                        email: string
                        phone: string
                        points: number
                        gender: string
                      }) => (
                        <tr
                          key={client.id}
                          className="border-b border-border last:border-0 hover:bg-secondary/50"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-foreground">
                              {client.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {client.email}
                            </p>
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
                          <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                            {client.gender === "Femenino" ? "F" : "M"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/admin/clients/${client.id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalles</span>
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    )
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
