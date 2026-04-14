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

function parseBirthdayValue(value: unknown, min: number, max: number) {
  if (value === null || value === undefined || value === "") return null
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return NaN
  return Math.floor(parsed)
}

function parseBirthdayFields(body: Record<string, unknown>) {
  const birthdayMonth = parseBirthdayValue(body.birthday_month, 1, 12)
  const birthdayDay = parseBirthdayValue(body.birthday_day, 1, 31)

  if (Number.isNaN(birthdayMonth) || Number.isNaN(birthdayDay)) {
    return { error: "La fecha de cumpleanos debe incluir un mes entre 1 y 12 y un dia entre 1 y 31." }
  }

  if ((birthdayMonth === null) !== (birthdayDay === null)) {
    return { error: "Debes completar mes y dia del cumpleanos o dejar ambos vacios." }
  }

  return { birthdayMonth, birthdayDay }
}

export async function GET(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const supabase = createAdminClient()

  if (!search.trim()) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clients: data || [] })
  }

  const phoneCandidates = buildPhoneCandidates(search)
  const baseQuery = supabase
    .from("clients")
    .select("*")
    .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)

  const phoneQuery =
    phoneCandidates.length > 0
      ? supabase.from("clients").select("*").in("phone", phoneCandidates)
      : Promise.resolve({ data: [], error: null })

  const [baseResult, phoneResult] = await Promise.all([baseQuery, phoneQuery])

  if (baseResult.error || phoneResult.error) {
    return NextResponse.json(
      { error: baseResult.error?.message || phoneResult.error?.message || "No se pudo consultar clientes." },
      { status: 500 },
    )
  }

  const merged = new Map<string, Record<string, unknown>>()
  for (const client of [...(baseResult.data || []), ...(phoneResult.data || [])]) {
    merged.set(String(client.id), client)
  }

  const clients = Array.from(merged.values()).sort((left, right) => {
    const leftPhone = String(left.phone || "")
    const rightPhone = String(right.phone || "")
    const leftMatch = phoneCandidates.includes(leftPhone) ? 0 : 1
    const rightMatch = phoneCandidates.includes(rightPhone) ? 0 : 1
    if (leftMatch !== rightMatch) return leftMatch - rightMatch

    return String(right.created_at || "").localeCompare(String(left.created_at || ""))
  })

  return NextResponse.json({ clients })
}

export async function POST(request: Request) {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const body = await request.json()
  const email = String(body.email || "").trim().toLowerCase()
  const fullName = String(body.full_name || "").trim()
  const phone = String(body.phone || "").trim()
  const address = String(body.address || "").trim()
  const gender = body.gender
  const birthday = parseBirthdayFields(body)

  if ("error" in birthday) {
    return NextResponse.json({ error: birthday.error }, { status: 400 })
  }

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
      birthday_month: birthday.birthdayMonth,
      birthday_day: birthday.birthdayDay,
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
