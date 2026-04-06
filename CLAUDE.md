# Helpdesk - AI-Powered Ticket Management System

## Project Overview

A ticket management system that uses AI to classify, respond to, and route support tickets. See `project-scope.md` for full requirements and `implementation-plan.md` for phased task breakdown.

## Tech Stack
- **Frontend**: React + TypeScript, Tailwind CSS, React Router (in `client/`)
- **Backend**: Node.js + Express + TypeScript (in `server/`)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Database sessions
- **AI**: Claude API (Anthropic)
- **Email**: SendGrid
- **Runtime/Package Manager**: Bun
- **Deployment**: Docker + cloud provider

## Project Structure
```
helpdesk/
├── client/       # React frontend (Vite, port 5173)
└── server/       # Express backend (port 3000)
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

## Notes
- Vite proxies `/api/*` requests to `http://localhost:3000` — always prefix API calls with `/api`
- Admin user is seeded at deployment; agents are created by the admin
