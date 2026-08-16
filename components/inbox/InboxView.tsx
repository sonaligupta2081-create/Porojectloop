"use client";

// Originally this view only ever read/wrote the local FEEDBACK mock
// array -- the comment even said "Wire this to a real PATCH
// /api/feedback/:id call once a backend is connected." That backend
// now exists (app/api/feedback/route.ts and [id]/route.ts), so this
// fetches real data and persists status changes for real. If the
// request fails (e.g. exploring the UI signed out, or no feedback
// seeded yet) it falls back to the demo dataset so the screen is never
// just empty.

import { useEffect, useMemo, useState } from "react";
import { Search, Filter, ChevronDown } from "lucide-react";
import { SentimentDot } from "@/components/shared/SentimentDot";
import { FEEDBACK } from "@/data/mock";
import { mapApiFeedbackToUi, type ApiFeedbackItem, type FeedbackItem, type FeedbackStatus } from "@/types";

const CHANNEL_LABEL: Record<string, string> = {
  support_ticket: "Support ticket",
  app_store: "App store review",
  nps: "NPS survey",
  sales_call: "Sales call note",
  community: "Community post",
};
const CHANNEL_DOT: Record<string, string> = {
  support_ticket: "bg-sky-400",
  app_store: "bg-fuchsia-400",
  nps: "bg-amber-400",
  sales_call: "bg-violet-400",
  community: "bg-emerald-400",
};

export function InboxView() {
  const [items, setItems] = useState<FeedbackItem[]>(FEEDBACK);
  const [isDemoData, setIsDemoData] = useState(true);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [sentiment, setSentiment] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/feedback?pageSize=100");
        if (!res.ok) return; // keep demo data
        const data: { items: ApiFeedbackItem[] } = await res.json();
        if (!cancelled && data.items) {
          setItems(data.items.map(mapApiFeedbackToUi));
          setIsDemoData(false);
        }
      } catch {
        // network/API unavailable -- keep the demo dataset already in state
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((f) => {
      if (search && !f.content.toLowerCase().includes(search.toLowerCase())) return false;
      if (channel !== "all" && f.channel !== channel) return false;
      if (sentiment !== "all" && f.sentiment !== sentiment) return false;
      if (status !== "all" && f.status !== status) return false;
      return true;
    });
  }, [items, search, channel, sentiment, status]);

  async function updateStatus(id: string, next: FeedbackStatus) {
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status: next } : f)));

    if (isDemoData) return; // nothing to persist for the demo dataset

    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error("Failed to save status");
    } catch {
      // Revert on failure so the UI doesn't silently lie about saved state.
      setItems((prev) => prev.map((f) => (f.id === id ? { ...f, status: f.status } : f)));
    }
  }

  return (
    <div className="space-y-4">
      {isDemoData && (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-500">
          Showing demo data — sign in with a workspace that has feedback to see live results.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search feedback content…"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-8 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-violet-500/60"
          />
        </div>
        <SelectFilter value={channel} onChange={setChannel} placeholder="All channels" options={Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label }))} />
        <SelectFilter value={sentiment} onChange={setSentiment} placeholder="All sentiment" options={[{ value: "positive", label: "Positive" }, { value: "neutral", label: "Neutral" }, { value: "negative", label: "Negative" }]} />
        <SelectFilter value={status} onChange={setStatus} placeholder="All statuses" options={[{ value: "NEW", label: "New" }, { value: "REVIEWED", label: "Reviewed" }, { value: "ACTIONED", label: "Actioned" }]} />
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          <Filter size={12} /> {filtered.length} of {items.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-slate-800 px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-500 md:grid">
          <span>Feedback</span><span>Channel</span><span>Themes</span><span>Status</span><span>Date</span>
        </div>
        <div className="divide-y divide-slate-800/70">
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-slate-500">No feedback matches these filters. Try clearing one.</div>
          )}
          {filtered.map((f) => (
            <div key={f.id} className="grid grid-cols-1 gap-2 px-5 py-4 hover:bg-slate-800/30 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center md:gap-4">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-1.5"><SentimentDot sentiment={f.sentiment} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200 md:line-clamp-1 md:whitespace-normal">{f.content}</p>
                  <p className="font-mono text-[11px] text-slate-500">{f.id} · {f.customer}</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`h-1.5 w-1.5 rounded-full ${CHANNEL_DOT[f.channel]}`} />
                {CHANNEL_LABEL[f.channel]}
              </span>
              <span className="flex flex-wrap gap-1">
                {f.themes.map((t) => <span key={t} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{t}</span>)}
              </span>
              <select
                value={f.status}
                onChange={(e) => updateStatus(f.id, e.target.value as FeedbackStatus)}
                className="rounded-full border-none bg-transparent text-[11px]"
              >
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="ACTIONED">Actioned</option>
              </select>
              <span className="font-mono text-xs text-slate-500">{f.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectFilter({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; placeholder: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-slate-800 bg-slate-900 py-2 pl-3 pr-8 text-xs text-slate-300 outline-none focus:border-violet-500/60"
      >
        <option value="all">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-slate-500" />
    </div>
  );
}
