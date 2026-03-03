import {
  CLIENT_PASSWORD_RULE,
  CLIENT_PUBLIC_SELECT,
  isValidSimplePassword,
} from "@/lib/client-fields"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { clientId, password } = await request.json()

  if (!clientId || typeof clientId !== "string") {
    return NextResponse.json({ error: "Cliente inválido." }, { status: 400 })
  }

  if (!password || typeof password !== "string" || !isValidSimplePassword(password)) {
    return NextResponse.json({ error: CLIENT_PASSWORD_RULE }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: existingClient, error: existingError } = await supabase
    .from("clients")
    .select("id, password_set")
    .eq("id", clientId)
    .single()

  if (existingError || !existingClient) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  if (existingClient.password_set) {
    return NextResponse.json(
      { error: "Esta cuenta ya tiene contraseña configurada." },
      { status: 409 },
    )
  }

  const { data: updatedClient, error: updateError } = await supabase
    .from("clients")
    .update({
      password_plain: password,
      password_set: true,
      password_updated_at: new Date().toISOString(),
    })
    .eq("id", clientId)
    .select(CLIENT_PUBLIC_SELECT)
    .single()

  if (updateError || !updatedClient) {
    return NextResponse.json(
      { error: updateError?.message || "No se pudo guardar la contraseña." },
      { status: 500 },
    )
  }

  const cookieStore = await cookies()
  cookieStore.set("sandeli_client_id", clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return NextResponse.json({ success: true, client: updatedClient })
}
