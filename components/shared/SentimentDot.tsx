import type { Sentiment } from "@/types";

const DOT_CLASS: Record<Sentiment, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-slate-400",
  negative: "bg-rose-400",
};

export function SentimentDot({ sentiment }: { sentiment: Sentiment }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${DOT_CLASS[sentiment]}`} />;
}
