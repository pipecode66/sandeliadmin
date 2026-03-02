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
    "Tus credenciales para iniciar sesion son:",
    `Correo: ${email}`,
    `Telefono: ${phone}`,
    "",
    "Puedes usar cualquiera de las dos.",
    "En cada inicio de sesion recibiras un codigo de verificacion por WhatsApp.",
  ].join("\n")
}

export function buildVerificationMessage(code: string) {
  return [
    `Sandeli - Tu codigo de verificacion es: ${code}`,
    "",
    "Este codigo expira en 5 minutos.",
    "No lo compartas con nadie.",
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
