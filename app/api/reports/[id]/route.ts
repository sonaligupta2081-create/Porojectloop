// app/api/reports/[id]/route.ts
//
// GET /api/reports/:id
//   Response 200: Report (full, including contentJson)
//   Response 404: not found or belongs to another workspace

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, errorResponse, ApiError } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();

    const report = await db.report.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
      include: { generatedBy: { select: { id: true, name: true } } },
    });

    if (!report) {
      throw new ApiError(404, "Report not found", "NOT_FOUND");
    }

    return NextResponse.json(report);
  } catch (err) {
    return errorResponse(err);
  }
}
