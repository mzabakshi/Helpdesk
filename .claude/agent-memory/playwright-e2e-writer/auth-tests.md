# Auth E2E Tests — Coverage Log

## File
`e2e/auth.spec.ts`

## Written
2026-04-09

## Test credentials
- Admin: admin@example.com / password123
- Agent: agent@example.com / password123

## Test groups & coverage

| Group | Scenarios |
|---|---|
| Valid credentials | Admin login → `/`; Agent login → `/` |
| Client-side validation | Empty form; invalid email format; empty email; empty password |
| Server-side errors | Wrong password → root error div; Non-existent email → root error div |
| Already authenticated | Visiting `/login` while authed (stays on login page — no redirect implemented yet) |
| Session persistence | Page refresh after login stays authed; unauthenticated direct navigation to `/` → `/login` |
| Sign out | Sign Out button clears session → `/login`; post-sign-out nav to `/` → `/login` |
| Role-based access | Admin → `/users` allowed; Agent → `/users` → `/`; Unauthed → `/users` → `/login`; Admin NavBar shows Users link; Agent NavBar hides Users link |

## Key implementation notes
- Used `page.getByLabel()` for form fields (matches `<Label htmlFor>` → `<Input id>`).
- Server error is rendered in a `div.bg-destructive/10` — tested via Tailwind class selector.
- `login()` helper navigates to `/login`, fills form, clicks Sign In, and waits for `waitForURL("/")`.
- The login page has NO redirect for already-authenticated users; test documents current behaviour.
- Admin-only route: `/users` (AdminLayout). ProtectedLayout wraps `/`.

## Routes in App.tsx
- `/login` → LoginPage (public)
- `/` → ProtectedLayout → HomePage
- `/users` → AdminLayout → UsersPage
