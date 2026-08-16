import { Sparkles } from "lucide-react";

export function Evidence({ count, small }: { count: number; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/10 font-mono text-violet-300 ${
        small ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Sparkles size={small ? 10 : 12} className="shrink-0" />
      grounded · {count} item{count === 1 ? "" : "s"}
    </span>
  );
}
