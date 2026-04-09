---
name: Audit Findings — April 2026
description: Confirmed auth/authz security findings from initial review of server/src/auth.ts, requireAuth middleware, index.ts, and client layout guards
type: project
---

Audit date: 2026-04-09. Scope: authentication, authorization, CORS, session handling.

**Why:** First security audit of the project — establishes baseline.
**How to apply:** Use as baseline for future audits; findings marked [OPEN] remain unremediated.

[OPEN] CORS hardcoded in index.ts — does not use TRUSTED_ORIGINS env var at runtime.
[OPEN] No requireAdminAuth middleware exists — admin role enforcement is client-side only.
[OPEN] No HTTP security headers (no helmet or equivalent).
[OPEN] No rate limiting on login or any API endpoint.
[OPEN] TRUSTED_ORIGINS in auth.ts accepts a single string — multiple origins not supported without code change.
[OPEN] req.session typed as optional/nullable — route handlers could silently skip role checks if not careful.
[OPEN] No server-side admin API routes exist yet — when they are added, they must enforce role server-side.
[INFO] role field correctly has input: false in Better Auth config — cannot be set via user-supplied data.
[INFO] disableSignUp: true correctly set — self-registration is blocked.
[INFO] AdminLayout correctly redirects agents away from /users.
