import { createHmac, timingSafeEqual } from "crypto"

const TOKEN_HEADER = { alg: "HS256", typ: "JWT" }
const DEFAULT_SECRET = "sandeli-public-client-secret"

export const CLIENT_ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

type TokenPayload = {
  sub: string
  iat: number
  exp: number
}

function getSecret() {
  return process.env.CLIENT_API_TOKEN_SECRET || process.env.ADMIN_PASSWORD || DEFAULT_SECRET
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8")
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url")
}

export function createClientAccessToken(
  clientId: string,
  expiresInSeconds = CLIENT_ACCESS_TOKEN_TTL_SECONDS,
) {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = {
    sub: clientId,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const encodedHeader = encodeBase64Url(JSON.stringify(TOKEN_HEADER))
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const data = `${encodedHeader}.${encodedPayload}`
  const signature = sign(data)
  return `${data}.${signature}`
}

export function verifyClientAccessToken(token: string) {
  const parts = token.split(".")
  if (parts.length !== 3) {
    return { ok: false as const, error: "Token inválido." }
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const signedData = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = sign(signedData)
  const signatureBuffer = Buffer.from(signature, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return { ok: false as const, error: "Firma de token inválida." }
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as TokenPayload
    const now = Math.floor(Date.now() / 1000)
    if (!payload?.sub || typeof payload.sub !== "string") {
      return { ok: false as const, error: "Token inválido." }
    }
    if (!payload.exp || payload.exp <= now) {
      return { ok: false as const, error: "Token expirado." }
    }
    return { ok: true as const, clientId: payload.sub }
  } catch {
    return { ok: false as const, error: "Token inválido." }
  }
}
