'use client';

import React from 'react';
import { MessageSquare, AlertTriangle, TrendingUp, Tag, ShieldAlert } from 'lucide-react';

interface StatCardsProps {
  totalItems: number;
  percentNegative: number;
  newThisWeek: number;
  topThemeName: string;
  isSpikeAlert: boolean;
}

export default function StatCards({
  totalItems,
  percentNegative,
  newThisWeek,
  topThemeName,
  isSpikeAlert,
}: StatCardsProps) {
  return (
    <div className="space-y-4">
      {/* Negativity Spike Alert Banner */}
      {isSpikeAlert && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-center justify-between text-rose-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-900/60 rounded-lg text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-rose-100">Negative Sentiment Spike Detected!</h4>
              <p className="text-xs text-rose-300/90">
                Negative feedback currently accounts for <span className="font-bold">{percentNegative}%</span> of total customer submissions this period.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-rose-900/80 text-rose-200 border border-rose-700/50 px-3 py-1 rounded-full">
            Action Required
          </span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Feedback */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Feedback</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalItems}</span>
            <span className="text-xs font-medium text-emerald-400">Multi-Channel</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Ingested across 5 active channels</p>
        </div>

        {/* % Negative Sentiment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">% Negative Feedback</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{percentNegative}%</span>
            <span className={`text-xs font-semibold ${percentNegative > 35 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {percentNegative > 35 ? 'High Friction' : 'Normal Range'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Requires triage intervention</p>
        </div>

        {/* New This Week */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New This Week</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">+{newThisWeek}</span>
            <span className="text-xs font-medium text-blue-400">Past 7 Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Incoming submissions volume</p>
        </div>

        {/* Top Active Theme */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Active Theme</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-white truncate max-w-[170px]">{topThemeName}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Highest feedback concentration</p>
        </div>
      </div>
    </div>
  );
}
