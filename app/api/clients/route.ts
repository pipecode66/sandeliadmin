import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { createAdminClient } from "@/lib/supabase/admin"

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

function buildPhoneCandidates(rawPhone?: string | null) {
  const digits = String(rawPhone || "").replace(/[^\d]/g, "")
  if (!digits) return []

  const candidates = new Set<string>([digits])
  if (digits.startsWith("57") && digits.length > 10) {
    candidates.add(digits.slice(2))
  }
  if (digits.length === 10) {
    candidates.add(`57${digits}`)
  }

  return Array.from(candidates)
}

function normalizePhoneForStorage(rawPhone?: string | null) {
  const candidates = buildPhoneCandidates(rawPhone)
  if (candidates.length === 0) return ""

  const localCandidate = candidates.find((item) => item.length === 10)
  return localCandidate || candidates[0]
}

export async function GET(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const supabase = createAdminClient()

  let query = supabase.from("clients").select("*").order("created_at", { ascending: false })

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
  const admin = await requireAdmin("supervisor")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const email = String(body.email || "").trim().toLowerCase()
  const fullName = String(body.full_name || "").trim()
  const phone = String(body.phone || "").trim()
  const address = String(body.address || "").trim()
  const gender = body.gender

  if (!email || !fullName || !phone || !address || !gender) {
    return NextResponse.json(
      { error: "Todos los campos son obligatorios." },
      { status: 400 },
    )
  }

  if (gender !== "Femenino" && gender !== "Masculino") {
    return NextResponse.json({ error: "Género inválido." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const userCode = generateUserCode()
  const normalizedPhone = normalizePhoneForStorage(phone)

  const { data: existingPhone } = await supabase
    .from("clients")
    .select("id")
    .in("phone", buildPhoneCandidates(normalizedPhone))
    .limit(1)
    .maybeSingle()

  if (existingPhone) {
    return NextResponse.json(
      { error: "Ya existe un cliente con ese número de teléfono." },
      { status: 409 },
    )
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      email,
      full_name: fullName,
      phone: normalizedPhone,
      address,
      gender,
      user_code: userCode,
      points: 0,
      redeemed_today: 0,
      daily_limit_override: false,
      password_plain: null,
      password_set: false,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un cliente con ese correo electrónico." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await createAuditLog({
    entityType: "client",
    entityId: client.id,
    action: "create",
    afterData: client,
    comment: typeof body.comment === "string" ? body.comment : null,
    adminUserId: admin.admin.id,
  })

  return NextResponse.json({ client }, { status: 201 })
}
