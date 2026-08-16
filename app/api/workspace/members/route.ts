// app/api/workspace/members/route.ts
//
// GET /api/workspace/members   (any authenticated role — read-only for non-admins)
//   Response 200: { id, name, email, role }[]
//
// PATCH /api/workspace/members   (ADMIN only)
//   Request: { "userId": string, "role": "ADMIN" | "ANALYST" | "VIEWER" }
//   Response 200: { id, name, email, role }
//   Response 400: if this would remove the workspace's last ADMIN
//   Response 404: if userId doesn't exist in the caller's workspace

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireRole, errorResponse, ApiError } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validate";

const updateRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export async function GET() {
  try {
    const ctx = await requireAuth();

    const members = await db.user.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(members);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireRole(["ADMIN"]);
    const body = await parseJsonBody(req, updateRoleSchema);

    const target = await db.user.findFirst({
      where: { id: body.userId, workspaceId: ctx.workspaceId },
    });
    if (!target) {
      throw new ApiError(404, "User not found in this workspace", "NOT_FOUND");
    }

    if (target.role === "ADMIN" && body.role !== "ADMIN") {
      const adminCount = await db.user.count({
        where: { workspaceId: ctx.workspaceId, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        throw new ApiError(
          400,
          "Cannot demote the workspace's last remaining admin",
          "LAST_ADMIN"
        );
      }
    }

    const updated = await db.user.update({
      where: { id: target.id },
      data: { role: body.role },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
