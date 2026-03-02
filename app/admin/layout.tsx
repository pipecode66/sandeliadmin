import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sandeli Admin - Panel de Control",
  description: "Panel administrativo de Sandeli para gestion de clientes, productos y programa de fidelizacion.",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
