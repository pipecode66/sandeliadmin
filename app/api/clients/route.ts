import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function generateUserCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"
  const specials = "#$@*!"
  let code = ""
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const specialChar = specials.charAt(Math.floor(Math.random() * specials.length))
  const insertPos = Math.floor(Math.random() * (code.length + 1))
  return code.slice(0, insertPos) + specialChar + code.slice(insertPos)
}

export async function GET(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const supabase = createAdminClient()

  let query = supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clients: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const body = await request.json()
  const { email, full_name, phone, address, gender } = body
  if (!email || !full_name || !phone || !address || !gender) {
    return NextResponse.json(
      { error: "Todos los campos son obligatorios." },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const userCode = generateUserCode()
  const normalizedPhone = String(phone).replace(/[^\d]/g, "")

  const { data: existingPhone } = await supabase
    .from("clients")
    .select("id")
    .eq("phone", normalizedPhone)
    .limit(1)
    .maybeSingle()

  if (existingPhone) {
    return NextResponse.json(
      { error: "Ya existe un cliente con ese numero de telefono." },
      { status: 409 },
    )
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      email,
      full_name,
      phone: normalizedPhone,
      address,
      gender,
      user_code: userCode,
      points: 0,
      password_plain: null,
      password_set: false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese correo electronico." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ client }, { status: 201 })
}
