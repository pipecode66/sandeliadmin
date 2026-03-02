import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("sandeli_client_id")
  return NextResponse.json({ success: true })
}
