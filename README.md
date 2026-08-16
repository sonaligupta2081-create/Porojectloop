# Project LOOP

AI-powered customer-feedback intelligence platform. Ingests feedback from
support tickets, app reviews, NPS surveys, sales call notes, and community
posts; auto-tags it into themes; and lets a team ask natural-language
questions ("Ask LOOP") that are answered *only* from feedback the system can
cite — no invented claims.

This is a single Next.js 14 (App Router) app: the UI, the API routes, and the
database layer all live in this one repo. See `CHANGELOG.md` for how this
got here and what changed along the way.

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Auth:** NextAuth (Auth.js) v4, credentials provider, JWT sessions
- **Database:** PostgreSQL + Prisma, with pgvector for semantic search
- **AI:** Anthropic Claude (answers, report narratives) + Voyage AI (embeddings)
- **Charts:** Recharts

## Project structure

```
app/
  (auth)/login, (auth)/signup      — public auth pages
  (app)/dashboard, inbox, trends,  — authenticated app shell
       ask, reports, settings        (protected by middleware.ts)
  api/                              — all backend routes (see API_CONTRACTS.md)
components/                        — UI components, grouped by feature
lib/                                — auth, db, validation, Claude/Voyage clients
prisma/                            — schema, seed script, migration notes
types.ts                           — shared frontend types
middleware.ts                      — route protection (redirects signed-out
                                      users away from the app, and signed-in
                                      users away from /login, /signup)
```

## Getting started

```bash
npm install

cp .env.example .env.local
# fill in DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY,
# and VOYAGE_API_KEY — see prisma/MIGRATION.md for the pgvector-specific
# migration steps (Postgres needs the `vector` extension enabled once).

npx prisma migrate dev
npx prisma db seed   # creates a demo workspace + 120+ feedback rows

npm run dev
```

Then sign in with one of the seeded demo accounts (see `prisma/seed.ts`):

| Email | Password | Role |
|---|---|---|
| `admin@acmedemo.test` | `DemoPass123!` | ADMIN |
| `analyst@acmedemo.test` | `DemoPass123!` | ANALYST |
| `viewer@acmedemo.test` | `DemoPass123!` | VIEWER |

These are local/dev-only demo credentials seeded by `prisma/seed.ts` — never
reuse this password anywhere real, and never run the seed script against a
production database.

If you skip the database/API-key setup, every screen still works — each view
falls back to a small in-memory demo dataset (`data/mock.ts`) and shows a
"Showing demo data" banner, so the UI is explorable without any backend
configured.

## What's still not wired up

Being upfront about the gaps rather than hiding them:

- **Workspace renaming** — the Settings UI has a workspace-name field, but
  there's no `PATCH /api/workspace` route yet to persist it.
- **Real invites** — "Invite" in Settings adds a local-only row; there's no
  invite-email endpoint yet. Role changes for *existing* members do work for
  real (`PATCH /api/workspace/members`).
- **Theme trend deltas** — the Trends view can't show real week-over-week
  "spiking" percentages, because the schema doesn't snapshot theme counts
  over time. Wiring that up would mean a scheduled job writing to a new
  `ThemeSnapshot` table and diffing against the previous run.
- **CSV import UI** — `POST /api/feedback/import` exists and works
  (multipart CSV, up to 5,000 rows), but there's no page in the UI that
  calls it yet.

See `CHANGELOG.md` for the full list of what *was* fixed.

## API

Full request/response contracts for every route are in `API_CONTRACTS.md`.
