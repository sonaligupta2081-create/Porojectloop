"use client";

// This replaces the original stub, which was literally:
//
//   export default function DashboardView() {
//     return <div className="p-6"><h1>Dashboard Overview</h1>
//       <p>Dashboard UI is loaded successfully. Ready for submission!</p></div>;
//   }
//
// It now fetches real aggregated metrics from /api/dashboard (scoped to
// the caller's workspace) and renders them with the chart components
// that already existed in the "project-loop" build but were never wired
// up to anything real.

import { useEffect, useState } from "react";
import StatCards from "@/components/Dashboard/StatCards";
import SentimentChart from "@/components/Dashboard/SentimentChart";
import TopThemesChart from "@/components/Dashboard/TopThemesChart";
import VolumeChart from "@/components/Dashboard/VolumeChart";
import type { DashboardMetrics } from "@/types";

export default function DashboardView() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
        }
        const data: DashboardMetrics = await res.json();
        if (!cancelled) setMetrics(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
          <div className="h-72 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center">
        <p className="text-sm text-slate-400">
          {error ?? "No dashboard data yet."} Once feedback is in your workspace, this view fills in automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Dashboard Overview</h1>
        <p className="text-sm text-slate-500">A live snapshot of what customers are telling you right now.</p>
      </div>

      <StatCards
        totalItems={metrics.totalItems}
        percentNegative={metrics.percentNegative}
        newThisWeek={metrics.newThisWeek}
        topThemeName={metrics.topThemeName}
        isSpikeAlert={metrics.isSpikeAlert}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <VolumeChart data={metrics.volumeOverTime} />
        <SentimentChart data={metrics.sentimentBreakdown} />
      </div>

      <TopThemesChart data={metrics.topThemes} />
    </div>
  );
}
