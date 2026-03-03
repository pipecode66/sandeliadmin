import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sandeli Admin - Panel de Control",
  description: "Panel administrativo de Sandeli para gesti\u00f3n de clientes, productos y programa de fidelizaci\u00f3n.",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
