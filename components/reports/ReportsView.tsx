"use client";

// Originally rendered only the static REPORTS mock array with no way
// to generate a new one. The backend already had working report
// generation (POST /api/reports, which pulls real feedback stats and
// asks Claude for a narrative summary in app/api/reports/route.ts) but
// nothing in the UI called it. This now lists real reports, lets
// ADMIN/ANALYST users generate a new one for a date range, and falls
// back to the demo dataset if the API is unreachable or empty.

import { useEffect, useState } from "react";
import { Download, Circle, Plus, Loader2 } from "lucide-react";
import { REPORTS } from "@/data/mock";
import type { VoCReport } from "@/types";

interface ApiReportSummary {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface ApiReportFull extends ApiReportSummary {
  contentJson: {
    totalFeedback: number;
    sentimentCounts: Record<string, number>;
    channelCounts: Record<string, number>;
    themeCounts: Record<string, number>;
    narrative: string;
  };
}

function formatPeriod(startIso: string, endIso: string) {
  const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}

export function ReportsView() {
  const [demoReports] = useState<VoCReport[]>(REPORTS);
  const [apiReports, setApiReports] = useState<ApiReportSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(REPORTS[0]?.id ?? null);
  const [fullReport, setFullReport] = useState<ApiReportFull | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genTitle, setGenTitle] = useState("Voice of Customer — This Period");
  const [genStart, setGenStart] = useState("");
  const [genEnd, setGenEnd] = useState("");
  const [genError, setGenError] = useState("");

  const isDemoData = apiReports === null || apiReports.length === 0;

  useEffect(() => {
    refreshList();
  }, []);

  async function refreshList() {
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) return;
      const data: ApiReportSummary[] = await res.json();
      setApiReports(data);
      if (data.length > 0) setSelectedId(data[0].id);
    } catch {
      // keep demo data
    }
  }

  useEffect(() => {
    if (isDemoData || !selectedId) {
      setFullReport(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reports/${selectedId}`);
        if (!res.ok) return;
        const data: ApiReportFull = await res.json();
        if (!cancelled) setFullReport(data);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, isDemoData]);

  async function generateReport() {
    setGenError("");
    if (!genStart || !genEnd) {
      setGenError("Pick a start and end date.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: genTitle, periodStart: genStart, periodEnd: genEnd }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to generate report");
      }
      const created: ApiReportFull = await res.json();
      setShowGenerate(false);
      await refreshList();
      setSelectedId(created.id);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  if (isDemoData) {
    const report = demoReports.find((r) => r.id === selectedId) ?? demoReports[0];
    if (!report) {
      return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
          <p className="text-sm text-slate-400">No reports yet. Generate your first Voice-of-Customer report once you have a week of feedback in.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-500">
          Showing demo data — sign in and add feedback to a workspace to generate real AI reports here.
        </p>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {demoReports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full rounded-xl border p-3.5 text-left transition ${
                  selectedId === r.id ? "border-violet-500/50 bg-violet-500/[0.07]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <p className="text-sm font-medium text-slate-100">{r.period}</p>
                <p className="mt-1 font-mono text-[11px] text-slate-500">Generated {r.generated}</p>
                <p className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                  <span>{r.stats.total} items</span>
                  <span className={r.stats.deltaPct >= 0 ? "text-rose-400" : "text-emerald-400"}>{r.stats.negativePct}% negative</span>
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">{report.title}</h3>
                <p className="text-xs text-slate-500">{report.period}</p>
              </div>
              <button className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-violet-500/40 hover:text-violet-300">
                <Download size={13} /> Export PDF
              </button>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              <Stat label="items this period" value={String(report.stats.total)} />
              <Stat label="negative" value={`${report.stats.negativePct}%`} tone="rose" />
              <Stat label="vs. last period" value={`${report.stats.deltaPct >= 0 ? "+" : ""}${report.stats.deltaPct}%`} tone={report.stats.deltaPct >= 0 ? "rose" : "emerald"} />
            </div>

            <Section title="Top themes">
              <div className="space-y-2">
                {report.topThemes.map((t) => (
                  <div key={t.name} className="rounded-lg border border-slate-800 p-3">
                    <p className="text-sm font-medium text-slate-200">{t.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{t.note}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Notable quotes">
              <div className="space-y-2">
                {report.quotes.map((q, i) => (
                  <blockquote key={i} className="border-l-2 border-violet-500/40 pl-3">
                    <p className="text-sm italic text-slate-300">&quot;{q.text}&quot;</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">{q.source}</p>
                  </blockquote>
                ))}
              </div>
            </Section>

            <Section title="Recommended actions" last>
              <div className="space-y-2">
                {report.actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg bg-slate-950/60 p-3">
                    <Circle size={14} className="mt-0.5 shrink-0 text-violet-400" />
                    <p className="text-sm text-slate-300">{a}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        <button
          onClick={() => setShowGenerate((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 py-2.5 text-xs font-medium text-slate-300 hover:border-violet-500/50 hover:text-violet-300"
        >
          <Plus size={14} /> Generate report
        </button>

        {showGenerate && (
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <input
              value={genTitle}
              onChange={(e) => setGenTitle(e.target.value)}
              placeholder="Report title"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none"
            />
            <div className="flex gap-2">
              <input type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} className="w-1/2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none" />
              <input type="date" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} className="w-1/2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none" />
            </div>
            {genError && <p className="text-[11px] text-rose-400">{genError}</p>}
            <button
              onClick={generateReport}
              disabled={generating}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-500 py-1.5 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-60"
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : null}
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
        )}

        {apiReports!.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={`w-full rounded-xl border p-3.5 text-left transition ${
              selectedId === r.id ? "border-violet-500/50 bg-violet-500/[0.07]" : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <p className="text-sm font-medium text-slate-100">{r.title}</p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">{formatPeriod(r.periodStart, r.periodEnd)}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
        {!fullReport ? (
          <p className="text-sm text-slate-500">Select a report to view its details.</p>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-100">{fullReport.title}</h3>
                <p className="text-xs text-slate-500">{formatPeriod(fullReport.periodStart, fullReport.periodEnd)}</p>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-3">
              <Stat label="items this period" value={String(fullReport.contentJson.totalFeedback)} />
              <Stat
                label="negative"
                value={`${Math.round(((fullReport.contentJson.sentimentCounts.NEG ?? 0) / fullReport.contentJson.totalFeedback) * 100)}%`}
                tone="rose"
              />
              <Stat label="themes covered" value={String(Object.keys(fullReport.contentJson.themeCounts).length)} />
            </div>

            <Section title="AI summary" last>
              <div className="whitespace-pre-wrap rounded-lg bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                {fullReport.contentJson.narrative}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "rose" | "emerald" }) {
  const color = tone === "rose" ? "text-rose-400" : tone === "emerald" ? "text-emerald-400" : "text-slate-100";
  return (
    <div className="rounded-xl bg-slate-950/60 p-3 text-center">
      <p className={`font-mono text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "" : "mb-6"}>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </div>
  );
}
