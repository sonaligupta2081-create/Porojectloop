// app/api/feedback/[id]/route.ts
//
// GET /api/feedback/:id
//   Response 200: Feedback (with feedbackThemes.theme included)
//   Response 404: if the row doesn't exist OR belongs to another workspace
//                 (same response either way — we never reveal that a
//                 different workspace's id "exists")
//
// PATCH /api/feedback/:id   (ADMIN, ANALYST only)
//   Request: any subset of
//     { content?, channel?, sourceRef?, customerLabel?, sentiment?,
//       sentimentScore?, status? }
//   Response 200: Feedback
//
// DELETE /api/feedback/:id   (ADMIN only)
//   Response 204: no body

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireRole, errorResponse, ApiError } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validate";
import { scopedFeedback } from "@/lib/scoped-db";

const updateSchema = z
  .object({
    content: z.string().min(1).max(10_000),
    channel: z.enum([
      "SUPPORT_TICKET",
      "APP_REVIEW",
      "NPS_SURVEY",
      "SALES_CALL_NOTE",
      "COMMUNITY_POST",
    ]),
    sourceRef: z.string().max(300).nullable(),
    customerLabel: z.string().max(200).nullable(),
    sentiment: z.enum(["POS", "NEU", "NEG"]),
    sentimentScore: z.number().min(-1).max(1),
    status: z.enum(["NEW", "REVIEWED", "ACTIONED"]),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Provide at least one field to update",
  });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireAuth();

    const item = await db.feedback.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
      include: { feedbackThemes: { include: { theme: true } } },
    });

    if (!item) {
      throw new ApiError(404, "Feedback not found", "NOT_FOUND");
    }

    return NextResponse.json(item);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole(["ADMIN", "ANALYST"]);
    const body = await parseJsonBody(req, updateSchema);

    const result = await scopedFeedback(ctx.workspaceId).updateById(params.id, body);

    if (result.count === 0) {
      // Either the id doesn't exist, or it belongs to another workspace —
      // updateMany's where clause makes both cases fail identically,
      // which is what we want.
      throw new ApiError(404, "Feedback not found", "NOT_FOUND");
    }

    const updated = await db.feedback.findFirst({
      where: { id: params.id, workspaceId: ctx.workspaceId },
      include: { feedbackThemes: { include: { theme: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole(["ADMIN"]);

    const result = await scopedFeedback(ctx.workspaceId).deleteById(params.id);

    if (result.count === 0) {
      throw new ApiError(404, "Feedback not found", "NOT_FOUND");
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errorResponse(err);
  }
}
