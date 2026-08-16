// app/api/feedback/route.ts
//
// GET /api/feedback
//   Query params (all optional):
//     page        number, default 1
//     pageSize    number, default 20, max 100
//     channel     "SUPPORT_TICKET" | "APP_REVIEW" | "NPS_SURVEY" | "SALES_CALL_NOTE" | "COMMUNITY_POST"
//     sentiment   "POS" | "NEU" | "NEG"
//     status      "NEW" | "REVIEWED" | "ACTIONED"
//     themeId     string (cuid) — filters to feedback tagged with this theme
//     from        ISO date string — createdAt >= from
//     to          ISO date string — createdAt <= to
//     q           string — full-text search over `content`
//
//   Response 200:
//     {
//       "items": Feedback[],
//       "page": number,
//       "pageSize": number,
//       "totalCount": number,
//       "totalPages": number
//     }
//
// POST /api/feedback   (ADMIN, ANALYST only)
//   Request:
//     {
//       "content": string,
//       "channel": Channel,
//       "sourceRef"?: string,
//       "customerLabel"?: string,
//       "sentiment": "POS" | "NEU" | "NEG",
//       "sentimentScore": number (-1..1),
//       "status"?: "NEW" | "REVIEWED" | "ACTIONED"   // defaults to NEW
//     }
//   Response 201: Feedback
//
// All queries are scoped to req.session.user.workspaceId via
// requireAuth()/requireRole() — see lib/auth.ts and lib/scoped-db.ts.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuth, requireRole, errorResponse } from "@/lib/auth";
import { parseJsonBody, parseOrThrow } from "@/lib/validate";
import { scopedFeedback } from "@/lib/scoped-db";

const channelEnum = z.enum([
  "SUPPORT_TICKET",
  "APP_REVIEW",
  "NPS_SURVEY",
  "SALES_CALL_NOTE",
  "COMMUNITY_POST",
]);
const sentimentEnum = z.enum(["POS", "NEU", "NEG"]);
const statusEnum = z.enum(["NEW", "REVIEWED", "ACTIONED"]);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  channel: channelEnum.optional(),
  sentiment: sentimentEnum.optional(),
  status: statusEnum.optional(),
  themeId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().max(500).optional(),
});

const createSchema = z.object({
  content: z.string().min(1).max(10_000),
  channel: channelEnum,
  sourceRef: z.string().max(300).optional(),
  customerLabel: z.string().max(200).optional(),
  sentiment: sentimentEnum,
  sentimentScore: z.number().min(-1).max(1),
  status: statusEnum.optional(),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth(); // any role can read

    const url = new URL(req.url);
    const query = parseOrThrow(listQuerySchema, Object.fromEntries(url.searchParams));
    // TS can't see through parseOrThrow's generic that zod's .default()
    // guarantees these are never undefined at runtime — guard anyway so
    // the type checker (and any future refactor of parseOrThrow) can't
    // silently turn this into a real bug.
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.FeedbackWhereInput = {
      workspaceId: ctx.workspaceId, // always present, never client-supplied
      channel: query.channel,
      sentiment: query.sentiment,
      status: query.status,
      createdAt:
        query.from || query.to
          ? { gte: query.from, lte: query.to }
          : undefined,
      ...(query.themeId
        ? { feedbackThemes: { some: { themeId: query.themeId } } }
        : {}),
      ...(query.q
        ? { content: { contains: query.q, mode: "insensitive" as const } }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      db.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          feedbackThemes: { include: { theme: true } },
        },
      }),
      db.feedback.count({ where }),
    ]);

    return NextResponse.json({
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["ADMIN", "ANALYST"]);
    const body = await parseJsonBody(req, createSchema);

    const created = await scopedFeedback(ctx.workspaceId).create({
      content: body.content,
      channel: body.channel,
      sourceRef: body.sourceRef,
      customerLabel: body.customerLabel,
      sentiment: body.sentiment,
      sentimentScore: body.sentimentScore,
      status: body.status ?? "NEW",
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
