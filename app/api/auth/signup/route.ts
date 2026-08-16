// app/api/auth/signup/route.ts
//
// POST /api/auth/signup
//
// Request:
//   { "workspaceName": string, "name": string, "email": string, "password": string (min 8) }
//
// Response 201:
//   { "userId": string, "workspaceId": string }
//
// Response 400: { "error": { "message": string, "code": "VALIDATION_ERROR" } }
// Response 409: { "error": { "message": string, "code": "EMAIL_TAKEN" } }
//
// Not behind requireAuth() — this is how a user gets their first session.
// Creates the Workspace and the ADMIN User atomically: if either insert
// fails, neither is committed, so we never end up with an orphaned
// workspace or a user with no workspace.

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/validate";
import { errorResponse, ApiError } from "@/lib/auth";

const signupSchema = z.object({
  workspaceName: z.string().min(2).max(100),
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req, signupSchema);
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "An account with this email already exists", "EMAIL_TAKEN");
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const result = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: body.workspaceName },
      });

      const user = await tx.user.create({
        data: {
          name: body.name,
          email,
          passwordHash,
          role: "ADMIN",
          workspaceId: workspace.id,
        },
      });

      return { workspace, user };
    });

    return NextResponse.json(
      { userId: result.user.id, workspaceId: result.workspace.id },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}
