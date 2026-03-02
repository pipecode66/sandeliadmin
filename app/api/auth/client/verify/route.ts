import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { clientId, code } = await request.json()
  const supabase = createAdminClient()

  // Find the latest unused verification code for this client
  const { data: verificationCode, error } = await supabase
    .from("verification_codes")
    .select("*")
    .eq("client_id", clientId)
    .eq("code", code)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error || !verificationCode) {
    return NextResponse.json(
      { error: "Codigo invalido o expirado." },
      { status: 401 }
    )
  }

  // Mark code as used
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("id", verificationCode.id)

  // Fetch full client data
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 })
  }

  // Set session cookie for client
  const cookieStore = await cookies()
  cookieStore.set("sandeli_client_id", client.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })

  return NextResponse.json({ client })
}
