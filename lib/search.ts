// lib/search.ts
//
// Embedding generation + pgvector similarity search.
//
// Anthropic doesn't currently offer an embeddings endpoint, so this uses
// Voyage AI (Anthropic's recommended embeddings partner) for the vector
// side, and reserves the Claude API for the generation step in
// lib/claude.ts. If your team wants a single-vendor setup instead, swap
// embedText()'s implementation for whatever embedding API you pick —
// nothing else in the codebase needs to change as long as the output
// dimension still matches the `vector(1536)` column in schema.prisma.

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY; // server-side only
const EMBEDDING_MODEL = "voyage-3"; // 1024-dim by default; adjust column size if you switch models
const EMBEDDING_DIM = 1536; // keep in sync with schema.prisma's vector(1536)

export async function embedText(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY is not configured");
  }

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: text, model: EMBEDDING_MODEL }),
  });

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status}`);
  }

  const json = (await res.json()) as { data: { embedding: number[] }[] };
  const vector = json.data[0]?.embedding;

  if (!vector || vector.length !== EMBEDDING_DIM) {
    throw new Error(
      `Unexpected embedding dimension: got ${vector?.length}, expected ${EMBEDDING_DIM}`
    );
  }

  return vector;
}

/** Upsert the embedding for a feedback row. Called after create/update. */
export async function upsertFeedbackEmbedding(feedbackId: string, text: string): Promise<void> {
  const vector = await embedText(text);
  const vectorLiteral = `[${vector.join(",")}]`;

  await db.$executeRaw`
    INSERT INTO embeddings (id, "feedbackId", vector)
    VALUES (${randomUUID()}, ${feedbackId}, ${vectorLiteral}::vector)
    ON CONFLICT ("feedbackId")
    DO UPDATE SET vector = ${vectorLiteral}::vector
  `;
}

export interface SemanticMatch {
  feedbackId: string;
  content: string;
  channel: string;
  sentiment: string;
  createdAt: Date;
  distance: number;
}

/**
 * Cosine-distance nearest-neighbor search, scoped to a single workspace.
 * The workspaceId filter is applied via a join back to `feedback` — this
 * is the semantic-search equivalent of the scoped-db.ts helpers, and is
 * just as mandatory: skipping it would let a query surface another
 * tenant's feedback content inside an AI-generated answer.
 */
export async function semanticSearch(
  workspaceId: string,
  queryText: string,
  limit = 8
): Promise<SemanticMatch[]> {
  const vector = await embedText(queryText);
  const vectorLiteral = `[${vector.join(",")}]`;

  const rows = await db.$queryRaw<
    { feedbackId: string; content: string; channel: string; sentiment: string; createdAt: Date; distance: number }[]
  >(Prisma.sql`
    SELECT f.id AS "feedbackId", f.content, f.channel, f.sentiment, f."createdAt",
           e.vector <=> ${vectorLiteral}::vector AS distance
    FROM embeddings e
    JOIN feedback f ON f.id = e."feedbackId"
    WHERE f."workspaceId" = ${workspaceId}
    ORDER BY distance ASC
    LIMIT ${limit}
  `);

  return rows;
}
