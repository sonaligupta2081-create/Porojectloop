"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";
import { LoopMark } from "@/components/shared/LoopMark";
import { NAV, SECONDARY_NAV } from "./nav-items";

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <>
      <button className="text-slate-400 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative flex h-full w-64 flex-col bg-slate-950 px-4 py-5">
            <div className="mb-8 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <LoopMark size={20} />
                <p className="text-sm font-bold tracking-tight text-slate-100">LOOP</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            <nav className="space-y-1">
              {[...NAV, ...SECONDARY_NAV].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
                    isActive(n.href) ? "bg-violet-500/10 text-violet-300" : "text-slate-400"
                  }`}
                >
                  <n.icon size={16} />
                  {n.label}
                </Link>
              ))}
              <button
                onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300/80"
              >
                <LogOut size={16} /> Log out
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${
            isActive(n.href) ? "text-violet-300" : "text-slate-500"
          }`}
        >
          <n.icon size={17} />
          {n.label === "Ask LOOP" ? "Ask" : n.label}
        </Link>
      ))}
    </nav>
  );
}
