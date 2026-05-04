# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Multi-user PostgreSQL SaaS platform with Replit Auth (OIDC), contract-first OpenAPI, and a React + Vite frontend.

## Artifacts

### CardScan AI (`artifacts/cardscan-ai`)
- Mobile-first web app for scanning business cards with Google Gemini AI
- React + Vite + Tailwind CSS, deployed at `/`
- Auth-gated via Replit Auth (OIDC) — login required to access any page
- Gemini API key stored in localStorage per-user (`getApiKey`/`saveApiKey`)
- Features: Dashboard, Contacts list, Contact detail with voice/written notes + AI analysis, Scan (camera/upload), Review & save with company matching, Events with countdown timers, CSV export

### API Server (`artifacts/api-server`)
- Express 5 server, deployed at `/api`
- Replit OIDC auth: custom session table in PostgreSQL, cookie-based `sid`
- Routes: `/api/auth/user`, `/api/login`, `/api/callback`, `/api/logout`, `/api/companies/*`, `/api/user/contacts/*`, `/api/user/events/*`, `/api/user/contacts/:id/notes/*`
- All user-scoped routes require `req.isAuthenticated()`

## Database Schema (`lib/db/src/schema/`)

| Table | Purpose |
|---|---|
| `users` | Replit OIDC user records (upserted on login) |
| `sessions` | Server-side session store (sid → JSON) |
| `companies` | Global shared company directory (businessName, address, lat/lng, etc.) |
| `user_contacts` | Per-user contacts, FK to `companies` and `user_events` |
| `user_events` | Per-user networking events with dateTime + reminderFrequency |
| `user_notes` | Per-user notes on contacts (written or voice), with aiSummary + todoItems |

## Shared Libraries

| Package | Purpose |
|---|---|
| `lib/db` | Drizzle ORM client + all schema tables |
| `lib/api-spec` | OpenAPI spec (`openapi.yaml`) + Orval codegen config |
| `lib/api-zod` | Zod schemas + TypeScript types generated from OpenAPI |
| `lib/api-client-react` | React Query hooks generated from OpenAPI |
| `lib/replit-auth-web` | `useAuth()` hook — fetches `/api/auth/user`, exposes `login`/`logout` |

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Replit OIDC (`openid-client` v6) with custom session middleware
- **Validation**: Zod (catalog pinned), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Build**: esbuild (ESM bundle for API server)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Auth Flow

1. User visits `/` → `useAuth()` calls `GET /api/auth/user`
2. If `{ user: null }` → AuthGate shows "Log in to get started"
3. `login()` → redirects to `/api/login` → Replit OIDC → `/api/callback` → sets `sid` cookie → redirects to `/`
4. Middleware reads `sid` cookie → looks up session → sets `req.user`
5. `logout()` → `/api/logout` → clears session + cookie → OIDC end_session

## Notes

- Gemini API key is stored per-browser in localStorage (not server-side) — user sets it in the Scan page settings
- Google Sheets integration has been fully removed; all contact storage is now PostgreSQL
- `artifacts/api-server/src/routes/sheets.ts` file exists but is not imported anywhere (can be deleted)
- `lib/events-storage.ts` in cardscan-ai is kept for `getCountdown()` and `REMINDER_LABELS` utility functions only
