import { createAdminClient } from "@/lib/supabase/admin"
import { buildVerificationMessage, sendWhatsAppText } from "@/lib/whatsapp"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { identifier } = await request.json()
  if (!identifier || typeof identifier !== "string") {
    return NextResponse.json(
      { error: "Debes enviar un correo o telefono valido." },
      { status: 400 },
    )
  }

  const normalizedIdentifier = identifier.trim()
  const supabase = createAdminClient()

  // Find client by email or phone
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .or(`email.eq.${normalizedIdentifier},phone.eq.${normalizedIdentifier}`)
    .single()

  if (error || !client) {
    return NextResponse.json(
      { error: "No se encontro una cuenta con esas credenciales." },
      { status: 404 }
    )
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  // Save verification code
  await supabase.from("verification_codes").insert({
    client_id: client.id,
    code,
    expires_at: expiresAt,
  })

  const whatsappResult = await sendWhatsAppText({
    to: client.phone,
    body: buildVerificationMessage(code),
  })

  if (!whatsappResult.ok && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: whatsappResult.error || "No se pudo enviar el codigo por WhatsApp." },
      { status: 500 },
    )
  }

  return NextResponse.json({
    success: true,
    clientId: client.id,
    clientName: client.full_name,
    phone: client.phone,
    warning: !whatsappResult.ok ? whatsappResult.error : undefined,
    // In development, include code for testing
    ...(process.env.NODE_ENV === "development" ? { code } : {}),
  })
}
