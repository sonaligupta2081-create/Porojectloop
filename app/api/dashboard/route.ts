// app/api/dashboard/route.ts
//
// GET /api/dashboard
//
// Response 200: DashboardMetrics (see types.ts) — everything the
// dashboard's stat cards and three charts need in one round trip.
//
// This route did not exist in either original build. The frontend-only
// version had a DashboardView that was a literal placeholder
// ("Dashboard UI is loaded successfully. Ready for submission!"), and
// the earlier combined build had a /api/dashboard/route.ts that called
// getActiveSession() and db.getDashboardMetrics() — neither of which
// exist anywhere in that codebase, so it could never have run. This is
// a working implementation against the real Prisma schema, scoped to
// the caller's workspace exactly like every other route in lib/scoped-db.ts.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, errorResponse } from "@/lib/auth";
import type { DashboardMetrics } from "@/types";

const SENTIMENT_COLOR: Record<string, string> = {
  POS: "#34d399",
  NEU: "#94a3b8",
  NEG: "#fb7185",
};

const THEME_PALETTE = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

export async function GET() {
  try {
    const ctx = await requireAuth();
    const workspaceId = ctx.workspaceId;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [totalItems, sentimentGroups, newThisWeek, themeCounts, recentFeedback] = await Promise.all([
      db.feedback.count({ where: { workspaceId } }),
      db.feedback.groupBy({
        by: ["sentiment"],
        where: { workspaceId },
        _count: { _all: true },
      }),
      db.feedback.count({ where: { workspaceId, createdAt: { gte: weekAgo } } }),
      db.theme.findMany({
        where: { workspaceId },
        select: {
          name: true,
          _count: { select: { feedbackThemes: true } },
        },
        orderBy: { feedbackThemes: { _count: "desc" } },
        take: 6,
      }),
      db.feedback.findMany({
        where: { workspaceId, createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true, sentiment: true },
      }),
    ]);

    const negativeCount = sentimentGroups.find((g) => g.sentiment === "NEG")?._count._all ?? 0;
    const percentNegative = totalItems > 0 ? Math.round((negativeCount / totalItems) * 100) : 0;

    const sentimentBreakdown = sentimentGroups.map((g) => ({
      name: g.sentiment === "POS" ? "Positive" : g.sentiment === "NEG" ? "Negative" : "Neutral",
      value: g._count._all,
      color: SENTIMENT_COLOR[g.sentiment],
    }));

    const topThemes = themeCounts.map((t, i) => ({
      name: t.name,
      count: t._count.feedbackThemes,
      color: THEME_PALETTE[i % THEME_PALETTE.length],
    }));

    // Bucket the last 14 days of feedback into daily volume + negative counts.
    const dayBuckets = new Map<string, { volume: number; negative: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      dayBuckets.set(key, { volume: 0, negative: 0 });
    }
    for (const item of recentFeedback) {
      const key = item.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const bucket = dayBuckets.get(key);
      if (!bucket) continue;
      bucket.volume += 1;
      if (item.sentiment === "NEG") bucket.negative += 1;
    }
    const volumeOverTime = Array.from(dayBuckets.entries()).map(([date, v]) => ({ date, ...v }));

    const metrics: DashboardMetrics = {
      totalItems,
      percentNegative,
      newThisWeek,
      topThemeName: topThemes[0]?.name ?? "No themes yet",
      isSpikeAlert: percentNegative > 35,
      sentimentBreakdown,
      topThemes,
      volumeOverTime,
    };

    return NextResponse.json(metrics);
  } catch (err) {
    return errorResponse(err);
  }
}
