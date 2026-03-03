import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "zivra@gmail.com"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "intermedios12."
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "Administrador Principal"
const ADMIN_ROLE = process.env.ADMIN_ROLE || "super_admin"

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.")
  console.error("Este script .mjs se ejecuta en terminal (Node), no en SQL Editor de Supabase.")
  console.error("Si necesitas SQL Editor, usa scripts/008_sync_admin_user.sql.")
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
    await ensureAdminUser(existing.id, ADMIN_EMAIL)
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

  const userId = data.user?.id
  if (userId) {
    await ensureAdminUser(userId, ADMIN_EMAIL)
  }

  console.log(`Admin creado correctamente: ${data.user?.email}`)
}

async function ensureAdminUser(authUserId, email) {
  const { error: upsertError } = await supabase.from("admin_users").upsert(
    {
      auth_user_id: authUserId,
      email: email.toLowerCase(),
      full_name: ADMIN_FULL_NAME,
      role: ADMIN_ROLE,
      is_active: true,
    },
    { onConflict: "auth_user_id" },
  )

  if (upsertError) {
    if (upsertError.code === "42P01") {
      console.warn(
        "Tabla admin_users no encontrada. Ejecuta primero scripts/007_admin_hierarchy_analytics_notifications.sql.",
      )
      return
    }
    console.error("No se pudo sincronizar admin_users:", upsertError.message)
    process.exit(1)
  }
}

run().catch((error) => {
  console.error("Error inesperado:", error)
  process.exit(1)
})
