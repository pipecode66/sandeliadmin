# Interconexión pública para app cliente

## Variables de entorno

Configura estas variables en el panel administrativo (Vercel):

- `PUBLIC_CLIENT_ORIGINS=https://v0-sandeli.vercel.app`
- `CLIENT_API_TOKEN_SECRET=<clave-larga-secreta>`

Opcional para pruebas locales:

- `PUBLIC_CLIENT_ORIGINS=https://v0-sandeli.vercel.app,http://localhost:3000`

## Endpoints públicos

Base URL: `https://<tu-panel>.vercel.app/api/public`

- `POST /auth/login`
- `POST /auth/setup-password`
- `GET /auth/me`
- `PATCH /auth/me`
- `POST /auth/logout`
- `GET /catalog`
- `GET /invoices`
- `GET /redemptions`
- `POST /redemptions`

Todos soportan preflight `OPTIONS` y CORS para `PUBLIC_CLIENT_ORIGINS`.

## Flujo de autenticación

1. Llama `POST /auth/login` con `identifier` (correo o teléfono) y `password`.
2. Si responde `requiresPasswordSetup: true`, llama `POST /auth/setup-password`.
3. Guarda `accessToken`.
4. Envía `Authorization: Bearer <accessToken>` en `auth/me`, `invoices`, `redemptions`.

## Tiempo real de catálogo

La app cliente debe consultar `GET /catalog` de forma periódica (por ejemplo cada 15-30 segundos) o en eventos de foco para reflejar cambios del panel en tiempo real.
