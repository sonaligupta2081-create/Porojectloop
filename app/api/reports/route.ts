// app/api/reports/route.ts
//
// GET /api/reports
//   Response 200: Report[]  (summary fields only; use GET /api/reports/:id for full contentJson)
//
// POST /api/reports   (ADMIN, ANALYST only) — generates a new Voice-of-Customer report
//   Request: { "title": string, "periodStart": ISO date string, "periodEnd": ISO date string }
//   Response 201: Report (full, including contentJson)
//
// Generation pulls all feedback in [periodStart, periodEnd] for the
// workspace, summarizes volume/sentiment/theme breakdowns in SQL, and
// asks Claude for a narrative summary grounded in that data (not raw
// feedback text, to keep the prompt small — see buildReportContent()).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireRole, errorResponse, ApiError } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validate";
import { scopedReport } from "@/lib/scoped-db";
import { callClaude } from "@/lib/claude";

const createSchema = z
  .object({
    title: z.string().min(1).max(200),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
  })
  .refine((v) => v.periodStart < v.periodEnd, {
    message: "periodStart must be before periodEnd",
    path: ["periodStart"],
  });

export async function GET() {
  try {
    const ctx = await requireAuth();

    const reports = await db.report.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        generatedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["ADMIN", "ANALYST"]);
    const body = await parseJsonBody(req, createSchema);

    const feedbackInPeriod = await db.feedback.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        createdAt: { gte: body.periodStart, lte: body.periodEnd },
      },
      include: { feedbackThemes: { include: { theme: true } } },
    });

    if (feedbackInPeriod.length === 0) {
      throw new ApiError(422, "No feedback in the given period", "NO_DATA");
    }

    const contentJson = await buildReportContent(feedbackInPeriod);

    const report = await scopedReport(ctx.workspaceId).create({
      title: body.title,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      contentJson,
      generatedById: ctx.userId,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

// --- helpers ---

type FeedbackWithThemes = Awaited<ReturnType<typeof db.feedback.findMany>>[number] & {
  feedbackThemes: { theme: { name: string } }[];
};

async function buildReportContent(items: FeedbackWithThemes[]) {
  const sentimentCounts = { POS: 0, NEU: 0, NEG: 0 } as Record<string, number>;
  const channelCounts: Record<string, number> = {};
  const themeCounts: Record<string, number> = {};

  for (const item of items) {
    sentimentCounts[item.sentiment] = (sentimentCounts[item.sentiment] ?? 0) + 1;
    channelCounts[item.channel] = (channelCounts[item.channel] ?? 0) + 1;
    for (const ft of item.feedbackThemes) {
      themeCounts[ft.theme.name] = (themeCounts[ft.theme.name] ?? 0) + 1;
    }
  }

  const statsBlock = JSON.stringify(
    { totalFeedback: items.length, sentimentCounts, channelCounts, themeCounts },
    null,
    2
  );

  const narrative = await callClaude(
    "You write concise Voice-of-Customer report summaries for a product/support team, " +
      "using only the aggregate statistics provided. Do not invent specific customer quotes " +
      "you weren't given. Structure your response as short sections: Overview, Sentiment, " +
      "Top Themes, Suggested Actions.",
    [{ role: "user", content: `Aggregate stats for this period:\n${statsBlock}` }],
    1500
  );

  return {
    totalFeedback: items.length,
    sentimentCounts,
    channelCounts,
    themeCounts,
    narrative,
  };
}
