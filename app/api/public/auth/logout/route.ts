import { corsJson, corsNoContent } from "@/lib/public-api"

const CORS_METHODS = "POST,OPTIONS"

export async function OPTIONS(request: Request) {
  return corsNoContent(request, CORS_METHODS)
}

export async function POST(request: Request) {
  return corsJson(request, { success: true }, { status: 200 }, CORS_METHODS)
}
