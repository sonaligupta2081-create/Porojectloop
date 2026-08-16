# Project LOOP — API Contracts

Base URL: `/api`. All endpoints except `/api/auth/*` require a valid
NextAuth session (cookie-based). All requests/responses are JSON unless
noted (CSV import is `multipart/form-data`).

## Error shape (every non-2xx response)

```json
{ "error": { "message": "human-readable message", "code": "MACHINE_CODE" } }
```

Common codes: `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `VALIDATION_ERROR` (400),
`NOT_FOUND` (404), `EMAIL_TAKEN` / `THEME_EXISTS` / `LAST_ADMIN` (409/400 conflict cases), `INTERNAL` (500).

Roles, weakest to strongest: `VIEWER` (read-only) < `ANALYST` (manage feedback/themes) < `ADMIN` (+ manage members/roles, delete feedback).

---

## Auth

### `POST /api/auth/signup`
Not authenticated. Creates a Workspace + ADMIN User together.

Request:
```json
{ "workspaceName": "Acme Inc", "name": "Ava Admin", "email": "ava@acme.com", "password": "min 8 chars" }
```
Response `201`: `{ "userId": "...", "workspaceId": "..." }`

### `POST /api/auth/callback/credentials` (via NextAuth, called by `signIn()` client helper)
Standard NextAuth credentials sign-in. Frontend should use `next-auth/react`'s `signIn("credentials", { email, password })`, not call this directly.

---

## Feedback

### `GET /api/feedback`
Query params (all optional): `page`, `pageSize` (max 100), `channel`, `sentiment`, `status`, `themeId`, `from`, `to` (ISO dates), `q` (text search).

Response `200`:
```json
{
  "items": [ { "id": "...", "content": "...", "channel": "SUPPORT_TICKET", "sourceRef": null,
               "customerLabel": "SMB - Retail", "sentiment": "NEG", "sentimentScore": -0.4,
               "status": "NEW", "createdAt": "2026-05-01T00:00:00.000Z",
               "feedbackThemes": [ { "confidence": 0.8, "theme": { "id": "...", "name": "Pricing concerns", "color": "#DC2626" } } ] } ],
  "page": 1, "pageSize": 20, "totalCount": 130, "totalPages": 7
}
```

### `POST /api/feedback` — ADMIN, ANALYST
Request: `{ "content", "channel", "sourceRef"?, "customerLabel"?, "sentiment", "sentimentScore" (-1..1), "status"? }`
Response `201`: the created Feedback row.

### `GET /api/feedback/:id` → Feedback (404 if missing/other workspace)

### `PATCH /api/feedback/:id` — ADMIN, ANALYST
Request: any subset of the POST fields. Response `200`: updated Feedback.

### `DELETE /api/feedback/:id` — ADMIN only → `204` no body

### `POST /api/feedback/import` — ADMIN, ANALYST
`multipart/form-data`, field `file` = CSV with header row: `content, channel, sourceRef, customerLabel, sentiment, sentimentScore, status`. Max 5,000 rows / 5MB.

Response `200`:
```json
{ "totalRows": 100, "successCount": 97, "failureCount": 3,
  "failures": [ { "row": 14, "error": "sentiment: Invalid enum value..." } ] }
```

---

## Themes

### `GET /api/themes` → `[{ "id", "name", "description", "color", "feedbackCount" }]`

### `POST /api/themes` — ADMIN, ANALYST
Request: `{ "name", "description"?, "color": "#RRGGBB" }` → `201` Theme

### `GET /api/themes/:id`
Query: `page`, `pageSize`. Response: `{ theme, items: Feedback[] (each with themeConfidence), page, pageSize, totalCount, totalPages }`

---

## Insights ("Ask LOOP") — for the AI engineers

### `POST /api/insights`
Request: `{ "question": "Why are customers unhappy with pricing?" }`

Response `200`:
```json
{
  "answer": "Customers cite ... [1] ... [3] ...",
  "citedFeedback": [
    { "id": "...", "content": "...", "channel": "SUPPORT_TICKET", "sentiment": "NEG",
      "createdAt": "2026-05-01T00:00:00.000Z", "relevance": 0.82 }
  ]
}
```
`[1]`, `[2]`, etc. in `answer` correspond to the position in `citedFeedback` (1-indexed) — render them as clickable citation chips.

Response `422` with code `NO_RESULTS` if no feedback embeddings match — show "no relevant feedback found" rather than a blank state.

**Note for the AI engineers:** feedback embeddings aren't backfilled automatically yet — `lib/search.ts` exports `upsertFeedbackEmbedding(feedbackId, text)`, which needs to be called after every feedback create/import (currently a manual/background step, see TODO in that file). Let's sync on whether that's a queue job or a synchronous call in the feedback routes before demo day.

---

## Reports

### `GET /api/reports` → summary list (no `contentJson`)
### `POST /api/reports` — ADMIN, ANALYST
Request: `{ "title", "periodStart": ISO date, "periodEnd": ISO date }` → `201` full Report incl. `contentJson`:
```json
{ "totalFeedback": 42, "sentimentCounts": {"POS":20,"NEU":10,"NEG":12},
  "channelCounts": {...}, "themeCounts": {...}, "narrative": "## Overview\n..." }
```
### `GET /api/reports/:id` → full Report

---

## Workspace members (admin settings page)

### `GET /api/workspace/members` → `[{ id, name, email, role }]`
### `PATCH /api/workspace/members` — ADMIN only
Request: `{ "userId", "role" }` → updated member. `400 LAST_ADMIN` if it would demote the workspace's only admin.
