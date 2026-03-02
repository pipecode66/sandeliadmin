const WHATSAPP_GRAPH_VERSION = "v21.0"

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "")
}

export function buildCredentialsMessage({
  email,
  phone,
}: {
  email: string
  phone: string
}) {
  return [
    "Bienvenido a Sandeli!",
    "",
    "Tu cuenta fue creada desde nuestro panel administrativo.",
    "",
    "Credenciales de acceso:",
    `Correo: ${email}`,
    `Telefono: ${phone}`,
    "",
    "En tu primer ingreso deberas crear una contraseña de 6 caracteres con mayuscula, numero y caracter especial.",
    "Despues podras iniciar sesion con tu correo o telefono y esa contraseña.",
  ].join("\n")
}

export async function sendWhatsAppText({
  to,
  body,
}: {
  to: string
  body: string
}) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneNumberId) {
    return {
      ok: false,
      error: "Faltan variables WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID",
    }
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(to),
        type: "text",
        text: { body },
      }),
    },
  )

  if (!response.ok) {
    let errorDetail = `WhatsApp API error ${response.status}`
    try {
      const data = await response.json()
      if (data?.error?.message) {
        errorDetail = `${errorDetail}: ${data.error.message}`
      }
    } catch {
      // Ignore JSON parse error and keep generic message.
    }

    return { ok: false, error: errorDetail }
  }

  return { ok: true }
}
