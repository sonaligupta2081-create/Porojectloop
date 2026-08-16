"use client";
import { useMemo } from "react";

export function Sparkline({ data, colorClass = "stroke-violet-400" }: { data: number[]; colorClass?: string }) {
  const points = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 30 - ((v - min) / range) * 26 - 2;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  return (
    <svg viewBox="0 0 100 30" className="h-8 w-20">
      <polyline points={points} fill="none" className={colorClass} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
