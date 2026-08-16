"use client";

import { signOut } from "next-auth/react";
import { Search, ShieldCheck, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { MobileMenuButton } from "./MobileNav";
import { NAV, SECONDARY_NAV } from "./nav-items";

export function Topbar({ role, initials, brandName }: { role: string; initials: string; brandName: string }) {
  const pathname = usePathname();
  const current = [...NAV, ...SECONDARY_NAV].find((n) => pathname?.startsWith(n.href));

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3.5 backdrop-blur sm:px-6">
      <MobileMenuButton />
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-100 sm:text-base">{current?.label ?? brandName}</span>
        <span className="text-[11px] text-slate-500">{brandName}</span>
      </div>
      <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
        <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
        <input
          placeholder="Search LOOP…"
          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-8 pr-3 text-xs text-slate-300 outline-none placeholder:text-slate-500 focus:border-violet-500/60"
        />
      </div>
      <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-slate-800 px-2.5 py-1 text-[11px] text-slate-400 sm:ml-0 md:flex">
        <ShieldCheck size={12} className="text-violet-400" /> {role}
      </span>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-300">
        {initials}
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title="Log out"
        className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:text-rose-300 sm:flex"
      >
        <LogOut size={14} />
      </button>
    </header>
  );
}
