// app/api/auth/signup/route.ts

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
  role: z.enum(["ADMIN", "ANALYST", "VIEWER"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req, signupSchema);
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ApiError(
        409,
        "An account with this email already exists",
        "EMAIL_TAKEN"
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const result = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: body.workspaceName,
        },
      });

      const user = await tx.user.create({
        data: {
          name: body.name,
          email,
          passwordHash,
          role: body.role,
          workspaceId: workspace.id,
        },
      });

      return { workspace, user };
    });

    return NextResponse.json(
      {
        userId: result.user.id,
        workspaceId: result.workspace.id,
        role: result.user.role,
      },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}