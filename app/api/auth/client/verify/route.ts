import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json(
    {
      error:
        "El flujo de verificación por código fue reemplazado. Usa /api/auth/client/login y /api/auth/client/setup-password.",
    },
    { status: 410 },
  )
}
