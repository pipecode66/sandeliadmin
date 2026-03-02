import { requireAdmin, requireClient } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get("client_id")
  const me = searchParams.get("me")
  const supabase = createAdminClient()

  let query = supabase
    .from("invoices")
    .select("*, clients(full_name, email)")
    .order("created_at", { ascending: false })

  if (me === "true") {
    const client = await requireClient()
    if (!client.ok) return client.response
    query = query.eq("client_id", client.clientId)
  } else {
    const admin = await requireAdmin()
    if (!admin.ok) return admin.response
  }

  if (clientId && me !== "true") {
    query = query.eq("client_id", clientId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoices: data })
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin.ok) return admin.response

  const body = await request.json()
  const { client_id, invoice_number, amount } = body
  const supabase = createAdminClient()

  // Calculate points: 1 point per $1000, only if amount >= $1000
  const pointsEarned = amount >= 1000 ? Math.floor(amount / 1000) : 0

  // Create the invoice
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      client_id,
      invoice_number,
      amount,
      points_earned: pointsEarned,
    })
    .select("*, clients(full_name, email)")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Add points to the client
  if (pointsEarned > 0) {
    const { data: client } = await supabase
      .from("clients")
      .select("points")
      .eq("id", client_id)
      .single()

    if (client) {
      await supabase
        .from("clients")
        .update({ points: client.points + pointsEarned })
        .eq("id", client_id)
    }
  }

  return NextResponse.json({ invoice, points_earned: pointsEarned }, { status: 201 })
}
