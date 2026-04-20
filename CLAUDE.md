# Helpdesk - AI-Powered Ticket Management System

## Project Overview

A ticket management system that uses AI to classify, respond to, and route support tickets. See `project-scope.md` for full requirements and `implementation-plan.md` for phased task breakdown.

## Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS v4, shadcn/ui, React Router v7, Axios, TanStack Query (in `client/`)
- **Backend**: Node.js + Express + TypeScript (in `server/`)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Better Auth (email/password, database sessions)
- **AI**: Claude API (Anthropic)
- **Email**: SendGrid
- **Runtime/Package Manager**: Bun
- **Deployment**: Docker + cloud provider

## Project Structure
```
helpdesk/
├── client/       # React frontend (Vite, port 5173)
├── server/       # Express backend (port 3000)
└── core/         # Shared code (Zod schemas, types) — imported by both client and server
```

## Running the Project
```bash
# Install dependencies (from root)
bun install

# Start server
cd server && bun run dev

# Start client
cd client && bun run dev
```

The client proxies `/api/*` requests to the server via Vite config.

## Key Conventions
- Use bun as the runtime and package manager (not npm/yarn)
- Use TypeScript throughout
- Use context7 MCP server to fetch up-to-date documentation for libraries
- Use shadcn/ui components for all UI — add new components with `bunx shadcn@latest add <component>`
- shadcn components live in `client/src/components/ui/`
- Use the `@/*` path alias for imports (maps to `client/src/`)
- Tailwind v4 is configured via `@tailwindcss/vite` plugin — no `tailwind.config.js` file
- Use shadcn semantic color tokens (e.g. `bg-muted`, `text-destructive`) rather than raw Tailwind colors
- Use **Axios** for all HTTP requests (never the native `fetch` API)
- Use **TanStack Query** (`useQuery`, `useMutation`) for all server state — data fetching, caching, and mutations; `QueryClientProvider` is set up in `client/src/main.tsx`
- Use **React Hook Form** + **Zod** for all forms — wire up with `useForm<T>({ resolver: zodResolver(schema) })`, spread `{...register("field")}` onto inputs, and render `errors.field.message` per field; server-side errors go in a separate `useState` displayed below the fields
- Define all **Zod schemas in `core/src/schemas/`** and export them from `core/src/index.ts` — import in both client and server via `import { ... } from "core"`; use the same schema for client-side RHF validation and server-side `safeParse` in route handlers

## Authentication

Better Auth handles all auth. Key details:

- **Server config**: `server/src/auth.ts` — Prisma adapter, email/password enabled, **sign-up disabled** (only admin can create agents)
- **User roles**: `role` field on the user (`admin` | `agent`), set server-side only (`input: false`), defaults to `agent`
- **Auth routes**: Better Auth mounts at `/api/auth/*` via `toNodeHandler(auth)` in `server/src/index.ts`
- **Client**: `client/src/lib/auth-client.ts` exports `authClient` (created with `createAuthClient()` + `inferAdditionalFields<typeof auth>()` plugin for typed `role` field)
  - Sign in: `authClient.signIn.email({ email, password })`
  - Session: `authClient.useSession()` React hook — `session.user.role` is typed as `"admin" | "agent"`
  - Sign out: `authClient.signOut()`
- **Route protection (frontend)**:
  - `ProtectedLayout` — redirects to `/login` if no session
  - `AdminLayout` — redirects to `/login` if no session, redirects to `/` if role is not `admin`
- **Route protection (backend)**:
  - `requireAuth` — `server/src/middleware/requireAuth.ts`; validates session via `auth.api.getSession()`, attaches to `req.session`; returns 401 if missing
  - `requireAdmin` — `server/src/middleware/requireAdmin.ts`; returns 403 if `req.session.user.role !== "admin"`; always apply after `requireAuth`
- **CORS**: `TRUSTED_ORIGINS` env var controls allowed origins in both `index.ts` and `auth.ts`; supports comma-separated multiple origins (e.g. `https://app.example.com,https://staging.example.com`)

## Security

- `helmet` is applied globally for HTTP security headers
- Rate limiting (`express-rate-limit`) is **production-only** (`NODE_ENV === "production"`):
  - `/api/*` — 200 requests per 15 minutes
  - `/api/auth/sign-in` — 20 requests per 15 minutes

## User Management

- Admin user is seeded via `server/src/seed.ts` (requires `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars)
- Agents are created by the admin (sign-up is disabled in Better Auth config)
- To seed a user manually, use `hashPassword` from `better-auth/crypto` and `generateId` from `better-auth` — run scripts from `server/` so packages resolve correctly

## Component Testing

- **Stack**: Vitest + React Testing Library + jsdom
- **Setup file**: `client/src/test/setup.ts` — imports `@testing-library/jest-dom` matchers
- **Test files**: co-locate next to the component/page as `*.test.tsx`
- **Query wrapper**: use `renderWithQuery` from `client/src/test/renderWithQuery.tsx` for any component that uses TanStack Query — it provides a fresh `QueryClient` with `retry: false` per test
- **Mocking HTTP**: mock `axios` with `vi.mock("axios")` and `vi.mocked(axios, true)`; use `vi.spyOn(axios, "isAxiosError").mockReturnValue(true as never)` to mock the type-predicate function
- **Run commands** (from `client/`):
  - `bun run test` — run all tests once
  - `bun run test:components` — run all tests once with verbose per-test output
  - `bun run test:watch` — run in watch mode

## Role Enum

Always use the `Role` enum from `core` instead of magic strings for user roles:

```ts
import { Role } from "core";

// ✅ correct
if (user.role === Role.Admin) { ... }
const role: Role = Role.Agent;

// ❌ never use magic strings
if (user.role === "admin") { ... }
```

- The enum is defined in `core/src/schemas/user.ts` and exported from `core/src/index.ts`
- Use `Role` for type annotations (e.g. `role: Role`) as well as comparisons
- This applies in all client code, shared types, and tests

## Unit Testing Requirements

**Every new feature must include unit tests.** When implementing a new feature or modifying an existing one:

- Co-locate the test file next to the component as `*.test.tsx`
- Cover: happy path, error states, loading/pending states, edge cases, and dialog open/close behaviour
- Use `renderWithQuery` from `@/test/renderWithQuery.tsx` for components that use TanStack Query
- Mock `axios` with `vi.mock("axios")` and `vi.mocked(axios, true)`; use `vi.spyOn(axios, "isAxiosError")` to mock the type-predicate
- Run `bun run test` from `client/` before marking a feature done — all tests must pass

## E2E Testing

**Default to component tests** (Vitest + React Testing Library) for all feature coverage. Use Playwright e2e tests only when the scenario genuinely cannot be covered at the component level:

- Auth flows that require real browser session cookies (e.g. login redirect behaviour)
- Webhook or external-integration endpoints (no browser UI to test against)
- Cross-page flows where multiple routes and navigation are integral to the assertion

Do **not** write e2e tests for CRUD operations, form validation, loading/error states, or role-based UI — cover those with component tests instead.

When e2e tests are warranted, use the `playwright-e2e-writer` agent to write them.

## Notes
- Vite proxies `/api/*` requests to `http://localhost:3000` — always prefix API calls with `/api`
- Admin user is seeded at deployment; agents are created by the admin
