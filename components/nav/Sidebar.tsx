"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { LoopMark } from "@/components/shared/LoopMark";
import { NAV, SECONDARY_NAV } from "./nav-items";

export function Sidebar({ workspaceName, role, brandName }: { workspaceName: string; role: string; brandName: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 md:flex">
      <div className="mb-8 flex items-center gap-3 px-1">
        <LoopMark />
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-100">Customer Feedback Intelligence Platform</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive(n.href) ? "bg-violet-500/10 text-violet-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
          >
            <n.icon size={16} />
            {n.label}
          </Link>
        ))}
        <div className="my-2 border-t border-slate-800/70" />
        {SECONDARY_NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${isActive(n.href) ? "bg-violet-500/10 text-violet-300" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
          >
            <n.icon size={16} />
            {n.label}
          </Link>
        ))}
      </nav>

      <Link href="/settings" className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2.5 transition hover:border-slate-700">
        <Building2 size={14} className="text-slate-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-300">{workspaceName}</p>
          <p className="flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck size={10} /> {role}
          </p>
        </div>
      </Link>
    </aside>
  );
}
