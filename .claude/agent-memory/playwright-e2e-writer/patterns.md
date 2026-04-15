---
name: Playwright test patterns for this project
description: Established patterns, selectors, and helpers used across e2e test files
type: project
---

## Credentials
Seeded users: admin@example.com / password123, agent@example.com / password123.
Fall back via `process.env.SEED_ADMIN_EMAIL ?? "admin@example.com"`.

## Login helper
```ts
async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/");
}
```
Note: the label is "Email address" (not just "Email") — this matches the LoginPage label text.

## Selector conventions
- Dialogs: `page.getByRole("dialog", { name: "<DialogTitle>" })`
- AlertDialog: `page.getByRole("alertdialog")`
- Edit button per row: `page.getByRole("button", { name: "Edit <userName>" })` — uses aria-label from UsersTable
- Delete button per row: `page.getByRole("button", { name: "Delete <userName>" })` — same pattern; invisible (but in DOM) for admin rows

## Test isolation
Use a `uid()` helper (`Date.now().toString(36)`) to generate unique names/emails per test run. Create disposable users in `beforeEach` for edit/delete tests rather than relying on the seeded agent, to keep tests independent and avoid ordering issues.

## Config notes
- `fullyParallel: false`, `workers: 1` — tests run serially; safe to do state-mutating ops without race conditions.
- `baseURL: "http://localhost:5173"` (Vite dev server).
- Global setup: runs Prisma migrations + `server/src/reset-test-db.ts` which seeds admin + agent.
