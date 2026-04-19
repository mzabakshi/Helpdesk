---
name: E2E test coverage map
description: Which features/pages have Playwright test coverage and what is tested
type: project
---

`e2e/auth.spec.ts` covers:
- Login happy path (admin + agent)
- Login validation errors (client-side)
- Login server-side errors (wrong password, unknown email)
- Session persistence after page reload
- Sign out flow
- Role-based access to /users (admin allowed, agent redirected to /, unauthed redirected to /login)
- NavBar Users link visibility per role

`e2e/users.spec.ts` covers:
- List: admin sees table with at least the admin row
- Create: fill Add User dialog, submit, row appears in table
- Edit: click pencil button, change name, save, updated name in table
- Delete: click trash button for agent row, confirm in AlertDialog, row removed

`e2e/webhooks.spec.ts` covers (API-only, no browser):
- Missing token → 401
- Wrong token → 401
- Wrong/missing token → no ticket created in DB (verified via test-only route)
- Valid request with "Name <email>" from → 200, ticket fields parsed correctly
- Plain email from (no angle brackets) → fromName and fromEmail both equal the email
- Missing subject → defaults to "(no subject)"
- Missing text → body is empty string

**Why:** Track this so we don't duplicate coverage and know gaps at a glance.
**How to apply:** Before writing new tests, check here first to avoid overlap.
