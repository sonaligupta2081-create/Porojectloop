// lib/auth.ts
//
// Every route handler that touches Feedback, Theme, FeedbackTheme,
// Embedding, or Report MUST go through requireAuth()/requireRole() to get
// its `ctx.workspaceId`, and MUST use that value — never a value read
// from the request body, query string, or URL params — in every Prisma
// `where` clause. See lib/scoped-db.ts for helpers that make this the
// path of least resistance.

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";
import type { Role } from "@prisma/client";

export interface AuthContext {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  role: Role;
  email: string;
  name: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

/**
 * Resolves the authenticated session into an AuthContext, or throws
 * ApiError(401). Use this at the top of every route handler.
 *
 * The returned workspaceId comes from the server-side session token —
 * it is never accepted from client input, so it cannot be spoofed by
 * editing a URL, form field, or JSON body.
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.workspaceId) {
    throw new ApiError(401, "Not authenticated", "UNAUTHENTICATED");
  }

  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    workspaceName: session.user.workspaceName,
    role: session.user.role,
    email: session.user.email,
    name: session.user.name,
  };
}

/**
 * requireAuth() + a role check. Pass the roles allowed to perform the
 * action. Throws ApiError(401) if unauthenticated, ApiError(403) if
 * authenticated but the role isn't permitted.
 *
 * Always call this server-side inside the route handler — never rely on
 * hiding a button or nav link client-side as the only enforcement.
 */
export async function requireRole(allowed: Role[]): Promise<AuthContext> {
  const ctx = await requireAuth();

  if (!allowed.includes(ctx.role)) {
    throw new ApiError(
      403,
      `Role ${ctx.role} is not permitted to perform this action`,
      "FORBIDDEN"
    );
  }

  return ctx;
}

/**
 * Uniform JSON error envelope for every route. Never leak raw error
 * objects, Prisma error internals, or stack traces to the client.
 */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { message: err.message, code: err.code ?? "ERROR" } },
      { status: err.status }
    );
  }

  // Zod errors are handled by callers via ApiError(400, ...) before they
  // ever reach here (see lib/validate.ts) — anything landing here is
  // unexpected, so log server-side and return a generic 500.
  console.error("Unhandled API error:", err);
  return NextResponse.json(
    { error: { message: "Internal server error", code: "INTERNAL" } },
    { status: 500 }
  );
}

/**
 * Wraps a route handler body so every thrown ApiError (or unexpected
 * error) turns into the standard error envelope, instead of every route
 * needing its own try/catch boilerplate.
 *
 * Usage:
 *   export const GET = withErrorHandling(async (req) => { ... });
 */
export function withErrorHandling(
  handler: (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Record<string, string> }) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
