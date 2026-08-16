// app/api/feedback/import/route.ts
//
// POST /api/feedback/import   (ADMIN, ANALYST only)
//
// Request: multipart/form-data with a single field "file" containing a
// CSV. Expected columns (header row required, case-insensitive):
//   content, channel, sourceRef, customerLabel, sentiment, sentimentScore, status
// `sourceRef`, `customerLabel`, `status` are optional per row.
//
// Response 200:
//   {
//     "totalRows": number,
//     "successCount": number,
//     "failureCount": number,
//     "failures": [ { "row": number, "error": string } ]   // capped at 50
//   }
//
// Design notes:
// - Every inserted row gets workspaceId from the session, never from the
//   CSV — a CSV can't carry a workspaceId column that would let someone
//   import into another tenant.
// - Rows are validated individually; one bad row doesn't fail the whole
//   import. Valid rows are inserted with createMany in one batch for
//   speed; we still need per-row validation results first, so we
//   validate all rows in memory, then batch-insert only the valid ones.
// - Caps: 5,000 rows and 5MB per import, to keep this a synchronous
//   request/response instead of needing a background job.

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { requireRole, errorResponse, ApiError } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const MAX_ROWS = 5000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const rowSchema = z.object({
  content: z.string().min(1).max(10_000),
  channel: z.enum([
    "SUPPORT_TICKET",
    "APP_REVIEW",
    "NPS_SURVEY",
    "SALES_CALL_NOTE",
    "COMMUNITY_POST",
  ]),
  sourceRef: z.string().max(300).optional().or(z.literal("")),
  customerLabel: z.string().max(200).optional().or(z.literal("")),
  sentiment: z.enum(["POS", "NEU", "NEG"]),
  sentimentScore: z.coerce.number().min(-1).max(1),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireRole(["ADMIN", "ANALYST"]);

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "Expected a multipart 'file' field", "MISSING_FILE");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(400, "File exceeds 5MB limit", "FILE_TOO_LARGE");
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new ApiError(400, "Could not parse CSV file", "PARSE_ERROR");
    }

    const rows = parsed.data;
    if (rows.length > MAX_ROWS) {
      throw new ApiError(400, `CSV exceeds ${MAX_ROWS} row limit`, "TOO_MANY_ROWS");
    }

    const validRows: Prisma.FeedbackCreateManyInput[] = [];
    const failures: { row: number; error: string }[] = [];

    rows.forEach((raw, idx) => {
      const rowNumber = idx + 2; // +1 for 0-index, +1 for header row
      const result = rowSchema.safeParse({
        content: raw.content,
        channel: raw.channel,
        sourceRef: raw.sourceRef || undefined,
        customerLabel: raw.customerLabel || undefined,
        sentiment: raw.sentiment,
        sentimentScore: raw.sentimentScore,
        status: raw.status || undefined,
      });

      if (!result.success) {
        failures.push({
          row: rowNumber,
          error: result.error.errors.map((e) => e.message).join("; "),
        });
        return;
      }

      validRows.push({
        content: result.data.content,
        channel: result.data.channel,
        sourceRef: result.data.sourceRef || null,
        customerLabel: result.data.customerLabel || null,
        sentiment: result.data.sentiment,
        sentimentScore: result.data.sentimentScore,
        status: result.data.status || "NEW",
        workspaceId: ctx.workspaceId, // never from the CSV
      });
    });

    if (validRows.length > 0) {
      await db.feedback.createMany({ data: validRows });
    }

    return NextResponse.json({
      totalRows: rows.length,
      successCount: validRows.length,
      failureCount: failures.length,
      failures: failures.slice(0, 50),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
