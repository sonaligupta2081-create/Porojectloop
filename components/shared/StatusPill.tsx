import type { FeedbackStatus } from "@/types";

const STYLE: Record<FeedbackStatus, { label: string; text: string; bg: string }> = {
  NEW: { label: "New", text: "text-sky-300", bg: "bg-sky-400/10" },
  REVIEWED: { label: "Reviewed", text: "text-amber-300", bg: "bg-amber-400/10" },
  ACTIONED: { label: "Actioned", text: "text-emerald-300", bg: "bg-emerald-400/10" },
};

export function StatusPill({ status }: { status: FeedbackStatus }) {
  const s = STYLE[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
}
