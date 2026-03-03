import { NextResponse } from "next/server"
import { verifyClientAccessToken } from "@/lib/client-access-token"

const DEFAULT_ALLOWED_ORIGINS = [
  "https://v0-sandeli.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
]

function getAllowedOrigins() {
  const fromEnv = (process.env.PUBLIC_CLIENT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])
}

export function buildCorsHeaders(request: Request, methods: string) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }

  const origin = request.headers.get("origin")
  if (origin && getAllowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
  }

  return headers
}

export function corsJson(
  request: Request,
  body: unknown,
  init: ResponseInit = {},
  methods = "GET,POST,PATCH,OPTIONS",
) {
  const response = NextResponse.json(body, init)
  const headers = buildCorsHeaders(request, methods)

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export function corsNoContent(request: Request, methods = "GET,POST,PATCH,OPTIONS") {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, methods),
  })
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization) return null
  const [type, token] = authorization.split(" ")
  if (type?.toLowerCase() !== "bearer" || !token) return null
  return token
}

export function requirePublicClient(request: Request) {
  const token = readBearerToken(request)
  if (!token) {
    return {
      ok: false as const,
      response: corsJson(request, { error: "Token de acceso requerido." }, { status: 401 }),
    }
  }

  const verification = verifyClientAccessToken(token)
  if (!verification.ok || !verification.clientId) {
    return {
      ok: false as const,
      response: corsJson(
        request,
        { error: verification.error || "Token inválido." },
        { status: 401 },
      ),
    }
  }

  return { ok: true as const, clientId: verification.clientId }
}
