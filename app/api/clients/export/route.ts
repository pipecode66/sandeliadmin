import ExcelJS from "exceljs"
import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function GET() {
  const admin = await requireAdmin("caja")
  if (!admin.ok) return admin.response

  const supabase = createAdminClient()
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Clientes")
  sheet.columns = [
    { header: "ID", key: "id", width: 38 },
    { header: "Nombre completo", key: "full_name", width: 32 },
    { header: "Correo electrónico", key: "email", width: 35 },
    { header: "Teléfono", key: "phone", width: 20 },
    { header: "Dirección", key: "address", width: 40 },
    { header: "Género", key: "gender", width: 16 },
    { header: "Puntos", key: "points", width: 14 },
    { header: "Código de cliente", key: "user_code", width: 22 },
    { header: "Cumpleaños (día/mes)", key: "birthday", width: 24 },
    { header: "Fecha de registro (UTC)", key: "created_at", width: 28 },
  ]

  // Page explicitly so Supabase's response limit never truncates the export.
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from("clients")
      .select("id,full_name,email,phone,address,gender,points,user_code,birthday_day,birthday_month,created_at")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) {
      return NextResponse.json({ error: "No se pudo exportar la base de clientes." }, { status: 500 })
    }
    for (const client of data || []) {
      sheet.addRow({
        ...client,
        phone: String(client.phone || ""),
        birthday: client.birthday_day && client.birthday_month
          ? `${String(client.birthday_day).padStart(2, "0")}/${String(client.birthday_month).padStart(2, "0")}` : "",
      })
    }
    if (!data || data.length < pageSize) break
  }

  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: "frozen", ySplit: 1 }]
  sheet.autoFilter = { from: "A1", to: "J1" }
  const buffer = await workbook.xlsx.writeBuffer()
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clientes-sandeli-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  })
}
