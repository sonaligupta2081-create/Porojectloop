// app/api/themes/[id]/route.ts
//
// GET /api/themes/:id
//   Query params: page (default 1), pageSize (default 20, max 100)
//   Response 200:
//     {
//       "theme": Theme,
//       "items": Feedback[],      // feedback tagged with this theme, incl. confidence
//       "page": number,
//       "pageSize": number,
//       "totalCount": number,
//       "totalPages": number
//     }
//   Response 404: theme not found or belongs to another workspace

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, errorResponse, ApiError } from "@/lib/auth";
import { parseOrThrow } from "@/lib/validate";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();
    const url = new URL(req.url);
    const query = parseOrThrow(querySchema, Object.fromEntries(url.searchParams));
    // See the matching comment in app/api/feedback/route.ts — parseOrThrow's
    // generic loses zod's .default() guarantee at the type level.
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const theme = await db.theme.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
    });
    if (!theme) {
      throw new ApiError(404, "Theme not found", "NOT_FOUND");
    }

    const [links, totalCount] = await Promise.all([
      db.feedbackTheme.findMany({
        where: { themeId: theme.id, feedback: { workspaceId: ctx.workspaceId } },
        include: { feedback: true },
        orderBy: { confidence: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.feedbackTheme.count({
        where: { themeId: theme.id, feedback: { workspaceId: ctx.workspaceId } },
      }),
    ]);

    return NextResponse.json({
      theme,
      items: links.map((l) => ({ ...l.feedback, themeConfidence: l.confidence })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
