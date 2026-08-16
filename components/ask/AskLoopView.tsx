"use client";

// Originally answerFor() below faked every response with hand-written
// per-keyword replies -- the comment literally said "not a real Claude
// API call... replace this with a fetch to your /api/insights route."
// That route now exists (app/api/insights/route.ts, backed by pgvector
// similarity search + Claude), so this calls it for real and only
// falls back to the canned demo answers if the request fails (e.g.
// no ANTHROPIC_API_KEY/VOYAGE_API_KEY configured yet, or no feedback
// seeded in the workspace).

import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Evidence } from "@/components/shared/Evidence";
import type { AskAnswer } from "@/types";

const SUGGESTED_Q = [
  "What are users saying about onboarding?",
  "Is churn risk related to SSO?",
  "What's trending negative this week?",
];

function demoAnswerFor(q: string): AskAnswer {
  const lower = q.toLowerCase();
  if (lower.includes("onboard")) {
    return {
      text: "Onboarding is the most-cited friction point this week, up 18%. The invite flow is the specific step people get stuck on — two customers accidentally created separate workspaces, and one support ticket ended in a live walkthrough that the customer said \"clicked immediately\" once explained.",
      sources: ["FB-482", "FB-347", "FB-270"],
    };
  }
  if (lower.includes("sso") || lower.includes("security") || lower.includes("churn")) {
    return {
      text: "SSO is now a recurring blocker rather than a one-off request. It's up 41% and tied directly to two lost enterprise deals in sales call notes, plus a security review that flagged missing SAML support as disqualifying for the enterprise tier.",
      sources: ["FB-388", "FB-301"],
    };
  }
  if (lower.includes("trend") || lower.includes("negative") || lower.includes("this week")) {
    return {
      text: "Onboarding and SSO / security are both spiking negative this week — up 18% and 41% respectively. Billing and performance are flat to slightly down, and exports & integrations is trending positive after last week's CSV theme-tag release.",
      sources: ["FB-482", "FB-388", "FB-360", "FB-255"],
    };
  }
  return {
    text: "I couldn't find enough grounded feedback in this workspace to answer that confidently. Try asking about onboarding, SSO, or what's trending negative this week — those have the most evidence behind them right now.",
    sources: [],
  };
}

interface InsightsResponse {
  answer: string;
  citedFeedback: { id: string; content: string }[];
}

async function answerFor(q: string): Promise<AskAnswer & { isDemo: boolean }> {
  try {
    const res = await fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    if (!res.ok) throw new Error("insights request failed");
    const data: InsightsResponse = await res.json();
    return { text: data.answer, sources: data.citedFeedback.map((c) => c.id), isDemo: false };
  } catch {
    return { ...demoAnswerFor(q), isDemo: true };
  }
}

type Message =
  | { role: "user"; text: string }
  | ({ role: "assistant"; question: string; isDemo?: boolean } & AskAnswer);

export function AskLoopView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const first = await answerFor("What are users saying about onboarding?");
      setMessages([{ role: "assistant", question: "What are users saying about onboarding?", ...first }]);
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question || pending) return;
    setInput("");
    setPending(true);
    setMessages((m) => [...m, { role: "user", text: question }]);
    const result = await answerFor(question);
    setMessages((m) => [...m, { role: "assistant", question, ...result }]);
    setPending(false);
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col rounded-2xl border border-slate-800 bg-slate-900/60 sm:h-[calc(100vh-9.5rem)]">
      <div className="border-b border-slate-800 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-100">Ask LOOP</h3>
        <p className="text-xs text-slate-500">Answers are grounded in retrieved feedback — never invented.</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-500/15 px-4 py-2.5 text-sm text-slate-100">{m.text}</div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div className="max-w-[92%] space-y-2 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-sm text-slate-300">{m.text}</p>
                {m.isDemo && <p className="text-[10px] uppercase tracking-wide text-amber-400/80">Demo answer — live AI not connected</p>}
                {m.sources.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Evidence count={m.sources.length} small />
                    {m.sources.map((id) => (
                      <span key={id} className="rounded-full border border-slate-700 px-2 py-0.5 font-mono text-[10px] text-slate-400">{id}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-500">Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-800 p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTED_Q.map((q) => (
            <button key={q} onClick={() => send(q)} className="rounded-full border border-slate-800 px-2.5 py-1 text-[11px] text-slate-400 hover:border-violet-500/40 hover:text-violet-300">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask a question about your customer feedback…"
            className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-violet-500/60"
          />
          <button onClick={() => send()} className="flex shrink-0 items-center justify-center rounded-xl bg-violet-500 p-2.5 text-white transition hover:bg-violet-400">
            <SendHorizontal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
