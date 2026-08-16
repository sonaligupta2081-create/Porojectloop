// app/api/themes/route.ts
//
// GET /api/themes
//   Response 200: Theme[]  (each with feedbackCount)
//
// POST /api/themes   (ADMIN, ANALYST only)
//   Request: { "name": string, "description"?: string, "color": string (hex) }
//   Response 201: Theme

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireRole, errorResponse, ApiError } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validate";
import { scopedTheme } from "@/lib/scoped-db";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "color must be a hex string like #4F46E5"),
});

export async function GET() {
  try {
    const ctx = await requireAuth();

    const themes = await db.theme.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { _count: { select: { feedbackThemes: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      themes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        color: t.color,
        feedbackCount: t._count.feedbackThemes,
      }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["ADMIN", "ANALYST"]);
    const body = await parseJsonBody(req, createSchema);

    const existing = await db.theme.findFirst({
      where: { workspaceId: ctx.workspaceId, name: body.name },
    });
    if (existing) {
      throw new ApiError(409, "A theme with this name already exists", "THEME_EXISTS");
    }

    const created = await scopedTheme(ctx.workspaceId).create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
