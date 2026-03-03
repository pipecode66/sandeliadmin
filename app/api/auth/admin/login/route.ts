import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email, password } = await request.json()
  const adminEmail = (process.env.ADMIN_EMAIL || "zivra@gmail.com").toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || "intermedios12."

  if ((email || "").toLowerCase() !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json(
      { error: `No se pudo iniciar sesión de administrador: ${error.message}` },
      { status: 401 },
    )
  }

  return NextResponse.json({ user: data.user })
}
