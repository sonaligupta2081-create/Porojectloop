"use client";

// Originally rendered only the static THEMES/FEEDBACK mock arrays.
// Now fetches real themes from /api/themes and the matching feedback
// from /api/themes/:id, falling back to the demo dataset if the
// request fails or the workspace has no themes yet.
//
// Known limitation: the backend doesn't track historical theme counts,
// so "change" (week-over-week %) and "spike" can't be computed from
// real data yet -- they're shown as flat/0 for live themes. Wiring
// real trend deltas would mean snapshotting theme counts on a
// schedule (e.g. a daily cron writing to a new ThemeSnapshot table)
// and diffing against the previous snapshot.

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Sparkline } from "@/components/shared/Sparkline";
import { SentimentDot } from "@/components/shared/SentimentDot";
import { Evidence } from "@/components/shared/Evidence";
import { THEMES, FEEDBACK } from "@/data/mock";
import { mapApiFeedbackToUi, type ApiFeedbackItem, type FeedbackItem, type ThemeSummary } from "@/types";

interface ApiTheme {
  id: string;
  name: string;
  feedbackCount: number;
}

export function TrendsView() {
  const [themes, setThemes] = useState<ThemeSummary[]>(THEMES);
  const [themeIds, setThemeIds] = useState<Record<string, string>>({});
  const [isDemoData, setIsDemoData] = useState(true);
  const [selected, setSelected] = useState<string | null>(THEMES[0]?.name ?? null);
  const [related, setRelated] = useState<FeedbackItem[]>(FEEDBACK.filter((f) => f.themes.includes(THEMES[0]?.name ?? "")));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/themes");
        if (!res.ok) return;
        const apiThemes: ApiTheme[] = await res.json();
        if (cancelled || apiThemes.length === 0) return;

        const mapped: ThemeSummary[] = apiThemes.map((t) => ({
          name: t.name,
          count: t.feedbackCount,
          change: 0,
          spike: false,
          spark: Array(7).fill(t.feedbackCount || 1),
        }));
        const ids: Record<string, string> = {};
        apiThemes.forEach((t) => (ids[t.name] = t.id));

        setThemes(mapped);
        setThemeIds(ids);
        setIsDemoData(false);
        setSelected(mapped[0]?.name ?? null);
      } catch {
        // keep demo data
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;

    if (isDemoData) {
      setRelated(FEEDBACK.filter((f) => f.themes.includes(selected)));
      return;
    }

    const themeId = themeIds[selected];
    if (!themeId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/themes/${themeId}?pageSize=50`);
        if (!res.ok) return;
        const data: { items: ApiFeedbackItem[] } = await res.json();
        if (!cancelled) setRelated(data.items.map(mapApiFeedbackToUi));
      } catch {
        // leave whatever was there
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, isDemoData, themeIds]);

  const activeTheme = themes.find((t) => t.name === selected);

  return (
    <div className="space-y-5">
      {isDemoData && (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-500">
          Showing demo data — themes and trends will populate once your workspace has real feedback.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => (
          <button
            key={t.name}
            onClick={() => setSelected(t.name)}
            className={`rounded-2xl border p-4 text-left transition ${
              selected === t.name ? "border-violet-500/50 bg-violet-500/[0.07]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-100">{t.name}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-500">{t.count} items</p>
              </div>
              {t.spike && <span className="shrink-0 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">spiking</span>}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Sparkline data={t.spark} colorClass={t.change >= 0 ? "stroke-emerald-400" : "stroke-rose-400"} />
              {!isDemoData ? null : (
                <span className={`flex items-center gap-0.5 font-mono text-xs font-medium ${t.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {Math.abs(t.change)}%
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {activeTheme && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{activeTheme.name}</h3>
              {isDemoData && (
                <p className="text-xs text-slate-500">vs. previous 7-day period, {activeTheme.change >= 0 ? "up" : "down"} {Math.abs(activeTheme.change)}%</p>
              )}
            </div>
            <Evidence count={related.length} />
          </div>
          <div className="divide-y divide-slate-800/70">
            {related.length === 0 && <p className="py-6 text-sm text-slate-500">No individual items tagged in the sample set for this theme.</p>}
            {related.map((f) => (
              <div key={f.id} className="flex items-start gap-3 py-3">
                <SentimentDot sentiment={f.sentiment} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300">{f.content}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{f.id} · {f.channel} · {f.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
