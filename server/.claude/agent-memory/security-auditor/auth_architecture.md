---
name: Auth & Authorization Architecture
description: Key facts about how auth, roles, CORS, and backend middleware are structured in this codebase — verified April 2026
type: project
---

- Better Auth configured in `server/src/auth.ts`: email/password enabled, sign-up disabled (`disableSignUp: true`), `role` field has `input: false` (cannot be set by user input).
- `requireAuth` middleware in `server/src/middleware/requireAuth.ts`: validates session via `auth.api.getSession()`, attaches to `req.session`, returns 401 if missing. Does NOT check role — role checks must be done per-route.
- As of April 2026, there are NO application routes beyond `/api/health` defined in `server/src/index.ts`. No `requireAuth` gaps yet, but the health endpoint is intentionally public.
- CORS in `server/src/index.ts` line 10 is hardcoded to `"http://localhost:5173"` — does NOT read from `TRUSTED_ORIGINS` env var at runtime even though `auth.ts` does. This is a discrepancy.
- `auth.ts` reads `process.env.TRUSTED_ORIGINS` for Better Auth's own CSRF/origin checks (single string, not array — potential misconfiguration if multiple origins needed).
- Frontend admin guard (`AdminLayout.tsx`) correctly checks `session.user.role !== "admin"` but this is client-side only — backend enforcement does not yet exist (no admin-only API routes implemented yet).
- `req.session` type is `typeof auth.$Infer.Session | null | undefined` — the optional chaining means role access in route handlers needs careful null checks.
- Seed script (`server/src/seed.ts`) reads admin credentials from env vars `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. No password complexity enforcement at seed time.
- No HTTP security headers middleware (helmet or equivalent) is present in `server/src/index.ts`.
- No rate limiting middleware is present anywhere in the server.
