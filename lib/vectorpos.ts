const VECTORPOS_BASE_URL = "https://api.vectorpos.com.co"

export type VectorPosInvoiceItem = {
  name?: string
  code?: string
  amount?: number | string
  priceUnit?: number | string
  priceTotal?: number | string
  details?: string
  tax?: unknown[]
}

export type VectorPosInvoiceClient = {
  name?: string
  phone?: string
  address?: string
}

export type VectorPosInvoice = {
  id: string
  items?: VectorPosInvoiceItem[]
  delivery_price?: number | string
  delivery_details?: string
  totalPaid?: number | string
  client?: VectorPosInvoiceClient
  msg?: string
}

function getVectorPosCredentials() {
  const user = process.env.VECTORPOS_API_USER
  const apiKey = process.env.VECTORPOS_API_KEY

  if (!user || !apiKey) {
    throw new Error("Missing VectorPOS credentials. Check VECTORPOS_API_USER and VECTORPOS_API_KEY.")
  }

  return { user, apiKey }
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^\d.-]/g, ""))
    return Number.isFinite(normalized) ? normalized : 0
  }
  return 0
}

export function buildPhoneCandidates(rawPhone?: string | null) {
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

export function normalizePhoneForStorage(rawPhone?: string | null) {
  const candidates = buildPhoneCandidates(rawPhone)
  if (candidates.length === 0) return ""

  const localCandidate = candidates.find((item) => item.length === 10)
  return localCandidate || candidates[0]
}

export function parseVectorPosAmount(invoice: VectorPosInvoice) {
  const totalPaid = toNumber(invoice.totalPaid)
  if (totalPaid > 0) return Math.round(totalPaid)

  const itemsTotal = (invoice.items || []).reduce((sum, item) => {
    const priceTotal = toNumber(item.priceTotal)
    if (priceTotal > 0) return sum + priceTotal

    const amount = toNumber(item.amount)
    const priceUnit = toNumber(item.priceUnit)
    return sum + amount * priceUnit
  }, 0)

  return Math.round(itemsTotal + toNumber(invoice.delivery_price))
}

export function hasVectorPosCredentials() {
  return Boolean(process.env.VECTORPOS_API_USER && process.env.VECTORPOS_API_KEY)
}

export async function fetchVectorPosInvoice(invoiceId: number) {
  const { user, apiKey } = getVectorPosCredentials()
  const token = Buffer.from(`${user}:${apiKey}`).toString("base64")
  const response = await fetch(`${VECTORPOS_BASE_URL}/invoice/${invoiceId}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`VectorPOS responded with ${response.status}.`)
  }

  const payload = (await response.json()) as VectorPosInvoice
  const notFound = payload?.msg === "Pedido no encontrado"
  return {
    exists: !notFound,
    invoice: payload,
  }
}
