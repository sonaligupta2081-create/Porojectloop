// lib/claude.ts
//
// Thin wrapper around the Anthropic Messages API. ANTHROPIC_API_KEY is
// read from the server environment only — this file must never be
// imported from a "use client" component.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-6";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callClaude(
  system: string,
  messages: ClaudeMessage[],
  maxTokens = 1024
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Claude API error ${res.status}: ${detail}`);
  }

  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
  };

  return json.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();
}
