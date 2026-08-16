// app/api/insights/route.ts
//
// POST /api/insights   ("Ask LOOP")
//
// Request:
//   { "question": string (min 3, max 1000) }
//
// Response 200:
//   {
//     "answer": string,
//     "citedFeedback": [
//       { "id": string, "content": string, "channel": string,
//         "sentiment": string, "createdAt": string, "relevance": number }
//     ]
//   }
//
// Response 422:
//   { "error": { "message": "No matching feedback found for this question", "code": "NO_RESULTS" } }
//
// Flow: embed the question -> pgvector similarity search scoped to the
// caller's workspaceId -> pass the retrieved feedback as grounding
// context to Claude -> return the answer plus the exact feedback rows
// used, so the frontend can render citations instead of asking users to
// trust an unsourced claim.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, errorResponse, ApiError } from "@/lib/auth";
import { parseJsonBody } from "@/lib/validate";
import { semanticSearch } from "@/lib/search";
import { callClaude } from "@/lib/claude";

const askSchema = z.object({
  question: z.string().min(3).max(1000),
});

const SYSTEM_PROMPT = `You are LOOP, an assistant that answers questions about customer feedback \
using only the feedback excerpts provided in the user message. \
Rules:
- Base your answer only on the provided excerpts. Do not use outside knowledge about the company or product.
- If the excerpts don't contain enough information to answer, say so plainly instead of guessing.
- Reference excerpts by their bracketed number, e.g. [1], [3], when a claim depends on them.
- Be concise: a few sentences or a short list, not a report.`;

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAuth(); // any role can ask questions
    const body = await parseJsonBody(req, askSchema);

    const matches = await semanticSearch(ctx.workspaceId, body.question, 8);

    if (matches.length === 0) {
      throw new ApiError(422, "No matching feedback found for this question", "NO_RESULTS");
    }

    const excerptBlock = matches
      .map(
        (m, i) =>
          `[${i + 1}] (${m.channel}, ${m.sentiment}, ${m.createdAt.toISOString().slice(0, 10)})\n${m.content}`
      )
      .join("\n\n");

    const answer = await callClaude(SYSTEM_PROMPT, [
      {
        role: "user",
        content: `Question: ${body.question}\n\nFeedback excerpts:\n${excerptBlock}`,
      },
    ]);

    return NextResponse.json({
      answer,
      citedFeedback: matches.map((m) => ({
        id: m.feedbackId,
        content: m.content,
        channel: m.channel,
        sentiment: m.sentiment,
        createdAt: m.createdAt,
        relevance: Math.max(0, 1 - m.distance), // cosine distance -> rough 0..1 relevance
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
