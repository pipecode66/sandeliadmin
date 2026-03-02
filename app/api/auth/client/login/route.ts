import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const { identifier, password, newPassword } = await request.json()
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
      { status: 404 },
    )
  }

  // Case 1: Client has no password yet -> prompt to create one
  if (!client.has_password) {
    // If newPassword is provided, set it
    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await supabase
        .from("clients")
        .update({
          password_hash: passwordHash,
          password_plain: newPassword,
          has_password: true,
        })
        .eq("id", client.id)

      // Set session cookie
      const cookieStore = await cookies()
      cookieStore.set("sandeli_client_id", client.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      })

      // Return full client data
      const { data: updatedClient } = await supabase
        .from("clients")
        .select("*")
        .eq("id", client.id)
        .single()

      return NextResponse.json({
        success: true,
        step: "authenticated",
        client: updatedClient,
      })
    }

    // No password provided yet -> tell frontend to show password creation form
    return NextResponse.json({
      success: true,
      step: "create_password",
      clientId: client.id,
      clientName: client.full_name,
    })
  }

  // Case 2: Client has password -> require it
  if (!password) {
    return NextResponse.json({
      success: true,
      step: "enter_password",
      clientId: client.id,
      clientName: client.full_name,
    })
  }

  // Verify password
  const isValid = await bcrypt.compare(password, client.password_hash!)
  if (!isValid) {
    return NextResponse.json(
      { error: "Contrasena incorrecta." },
      { status: 401 },
    )
  }

  // Set session cookie
  const cookieStore = await cookies()
  cookieStore.set("sandeli_client_id", client.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return NextResponse.json({
    success: true,
    step: "authenticated",
    client,
  })
}
