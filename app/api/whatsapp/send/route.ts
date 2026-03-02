import { requireAdmin } from "@/lib/auth"
import { sendWhatsAppText } from "@/lib/whatsapp"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { to, message } = await request.json()
  if (!to || !message) {
    return NextResponse.json(
      { error: "Debes enviar telefono y mensaje." },
      { status: 400 },
    )
  }

  const result = await sendWhatsAppText({
    to: String(to),
    body: String(message),
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "No se pudo enviar mensaje." },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
