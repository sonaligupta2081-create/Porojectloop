# Changelog — merging three builds into one

The uploaded zip contained three separate, non-overlapping builds of the same
app:

1. **`project-loop`** — an early combined attempt (UI + a few API routes +
   Prisma schema together). Its dashboard route called functions
   (`getActiveSession`, `db.getDashboardMetrics`) that didn't exist anywhere
   in the codebase, so it could never have run. Its `DashboardView` chart
   components (`StatCards`, `VolumeChart`, `SentimentChart`,
   `TopThemesChart`) were solid, though, and are reused below.
2. **`Project_loop_backend`** — a complete, well-designed backend: real
   multi-tenant Prisma schema, NextAuth credentials auth, every CRUD route
   for feedback/themes/reports/members, a documented `API_CONTRACTS.md`, and
   an actual `.git` history. No UI.
3. **`loop-nextjs-frontend`** — a polished UI (nav, dashboard shell, inbox,
   trends, reports, ask, settings) with a checked-in `node_modules/`
   (~407MB of the zip's ~460MB). It ran entirely on mock data, and its
   `DashboardView` was a literal placeholder: *"Dashboard UI is loaded
   successfully. Ready for submission!"*

This merge takes backend #2 as the source of truth for auth/data/API routes,
UI #3 as the source of truth for pages/components/styling, and pulls the
working chart components out of #1 — then wires the seams together and fixes
what was broken in each.

## Structural cleanup

- Removed the checked-in `node_modules/` (407MB) and stale `.next/` build
  output (68MB combined across the two backend/frontend builds) — regenerate
  with `npm install`.
- Removed the nested `Project_loop_backend/Project_loop_backend/` double
  folder and the `.git/` directory that came with it.
- **Removed real secrets that were committed to the zip**: `.env` and
  `.env.local` in the backend build contained an actual (weak) database
  password and NextAuth secret. Neither file is included in this output —
  only the placeholder `.env.example`. If those credentials were ever used
  against a real, reachable database, treat them as compromised and rotate
  them.
- Collapsed three `package.json` files into one (dependency union, see
  below).

## Security fixes

- **Next.js 14.2.15 → 14.2.35.** The installed version was vulnerable to
  CVE-2025-29927 (a middleware authorization bypass — directly relevant
  here, since this merge adds `middleware.ts` for route protection) plus the
  December 2025 React Server Components CVEs (source exposure / DoS). No
  code changes needed on our side, just the version bump.
- **Added `middleware.ts`.** The frontend build had *no* server-side route
  protection at all — `(app)/layout.tsx` only read a `loopDemoSession` key
  from `localStorage` to decide what name/role to *display*; it never
  gated access. Anyone could open `/dashboard`, `/inbox`, etc. directly
  while signed out. Middleware now enforces this the same way the API
  routes already enforce tenancy: server-side, not by hiding a link.
- **Fixed logout.** Both the desktop and mobile "Log out" buttons just
  called `router.push("/login")` without ending the session. Once
  middleware redirects signed-in users away from `/login`, that would have
  just bounced them straight back to `/dashboard`. Now calls NextAuth's
  `signOut()`.

## Bug fixes

- **Dashboard was a non-functional stub** (`DashboardView`) or called
  nonexistent functions (`project-loop`'s `/api/dashboard`). Added a real
  `app/api/dashboard/route.ts` that aggregates total feedback, sentiment
  breakdown, 7-day new-item count, top themes, and a 14-day volume trend —
  all scoped to the caller's workspace like every other route — and wired
  it to the (previously unused) chart components.
- **`next.config.mjs` proxied `/api/*` to a hardcoded
  `http://localhost:3000`**, a placeholder for "the backend" from when the
  frontend had none. Removed now that API routes live in this same app;
  the old rewrite would have broken any deployment on a different host or
  port.
- **Pagination type hole in `lib/validate.ts`.** `parseOrThrow<T>`'s generic
  loses TypeScript's awareness that Zod's `.default()` guarantees a
  non-undefined value, so `query.page` / `query.pageSize` type-checked as
  possibly `undefined` even though they never are at runtime (confirmed
  with an isolated repro against the exact zod version in use). Added
  explicit `?? fallback` guards at both call sites
  (`app/api/feedback/route.ts`, `app/api/themes/[id]/route.ts`) so this is
  safe at the type level too, not just by luck at runtime.
- **`AuthForm`, `InboxView`, `TrendsView`, `ReportsView`, `AskLoopView`,
  `SettingsView` all only read/wrote local mock state or `localStorage`**,
  with comments in several of them along the lines of *"wire this up once
  a backend is connected."* One (`AuthForm`) was already partway wired to
  real `signIn`/`signup` calls but had no `<SessionProvider>` in the tree
  for `next-auth/react` hooks to work — added `app/providers.tsx` and wrapped
  the root layout. The rest are now wired to the real API
  (`/api/feedback`, `/api/themes`, `/api/insights`, `/api/reports`,
  `/api/workspace/members`), each falling back to the demo dataset with a
  visible "Showing demo data" banner if the request fails — so the app is
  still explorable with zero configuration, which was the frontend build's
  original intent, just now backed by something real when it's available.
- **`(app)/layout.tsx` read a fake session from `localStorage`.** Nothing
  ever wrote real session data into that key on an actual login. Rewritten
  as a server component reading the real NextAuth session via
  `getServerSession`.
- **Missing `types.ts`.** Several components (`data/mock.ts`, `InboxView`,
  `SettingsView`, `AskLoopView`, `SentimentDot`) imported from `@/types`,
  but that file didn't exist anywhere in the frontend build — it could not
  have compiled. Added it, plus `mapApiFeedbackToUi()` to convert between
  the API's Prisma-shaped enums (`SUPPORT_TICKET`, `POS`, ...) and the UI's
  friendlier mock-data enums (`support_ticket`, `positive`, ...) so real API
  responses render through the same components built for the mock data.
- **`.env.example` was missing `VOYAGE_API_KEY`**, which `lib/search.ts`
  requires for embeddings (used by Ask LOOP and theme matching). Without it
  configured, `/api/insights` fails at runtime with a clear "not configured"
  error rather than silently doing nothing — but it's easy to miss the
  requirement until you hit that error. Added to `.env.example` with an
  explanatory comment.

## Feature additions (closing gaps between the two builds)

- **Report generation UI.** The backend's `POST /api/reports` (real Claude
  narrative generation grounded in aggregate stats, not raw feedback text)
  existed but nothing in the UI called it. `ReportsView` now lists real
  reports and has a "Generate report" form (title + date range).
- **Role management UI.** `PATCH /api/workspace/members` (with "can't
  demote the last admin" enforced server-side) existed but was unused.
  `SettingsView` now lets an ADMIN change a member's role for real.
- **`workspaceName` on the session.** Added to the NextAuth JWT/session
  (mirroring how `role` and `workspaceId` already worked) so the sidebar
  and settings page can show it without an extra per-page DB query.

## What was *not* changed

The Prisma schema, all existing API route logic, `lib/auth.ts`,
`lib/scoped-db.ts`, and the tenancy-scoping pattern throughout were already
well-designed (proper indexes, `workspaceId` enforced server-side and never
trusted from client input, `updateMany`/`deleteMany` used specifically to
avoid cross-tenant writes) — left as-is.
