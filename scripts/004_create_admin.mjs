import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "zivra@gmail.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "intermedios12."

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

async function run() {
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  if (listError) {
    console.error("No se pudo listar usuarios:", listError.message)
    process.exit(1)
  }

  const existing = usersData.users.find(
    (user) => (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase(),
  )

  if (existing) {
    console.log(`El admin ${ADMIN_EMAIL} ya existe (id: ${existing.id}).`)
    return
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  })

  if (error) {
    console.error("No se pudo crear el admin:", error.message)
    process.exit(1)
  }

  console.log(`Admin creado correctamente: ${data.user?.email}`)
}

run().catch((error) => {
  console.error("Error inesperado:", error)
  process.exit(1)
})
