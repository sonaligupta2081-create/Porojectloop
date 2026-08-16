"use client";

// Originally this entire view was local-only: workspace name and
// members lived in localStorage keys ("loopDemoSession",
// "loopDemoWorkspaceMembers:<name>") that nothing else ever wrote to
// on a real login, so it only ever worked as a self-contained demo.
// The backend already has a real members endpoint
// (GET/PATCH /api/workspace/members in app/api/workspace/members/route.ts)
// enforcing "can't demote the last admin" server-side -- this now reads
// and writes through that instead of localStorage. There's still no
// invite/email backend endpoint, so "Invite" stays a local-only demo
// action (clearly labeled) until that route exists.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Mail, Plus, MoreHorizontal, Trash2, ShieldCheck, Users2 } from "lucide-react";
import type { Member, Role } from "@/types";

const ROLE_STYLE: Record<Role, { text: string; bg: string }> = {
  ADMIN: { text: "text-violet-300", bg: "bg-violet-500/10" },
  ANALYST: { text: "text-sky-300", bg: "bg-sky-500/10" },
  VIEWER: { text: "text-slate-400", bg: "bg-slate-500/10" },
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

interface ApiMember {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function SettingsView({ workspaceName = "" }: { workspaceName?: string }) {
  const { data: session } = useSession();
  const [name, setName] = useState(workspaceName);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("VIEWER");
  const [members, setMembers] = useState<Member[]>([]);
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [error, setError] = useState("");

  const canManageMembers = session?.user.role === "ADMIN";

  useEffect(() => {
    if (session?.user.workspaceName) setName(session.user.workspaceName);
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspace/members");
        if (!res.ok) return;
        const data: ApiMember[] = await res.json();
        if (!cancelled) {
          setMembers(data.map((m) => ({ id: m.id, name: m.name, email: m.email, role: m.role, initials: getInitials(m.name) })));
        }
      } catch {
        // no session / API unreachable -- leave the list empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function invite() {
    // Demo-only: there's no POST /api/workspace/invite endpoint yet, so
    // this adds a local row and is clearly not a real invite email.
    if (!inviteEmail.trim()) return;
    const newMember: Member = {
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole,
      initials: inviteEmail.slice(0, 2).toUpperCase(),
    };
    setMembers((prev) => [...prev, newMember]);
    setInviteEmail("");
    setInviteOpen(false);
  }

  async function changeRole(member: Member, role: Role) {
    if (!canManageMembers || !member.id) return;
    setError("");
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.email === member.email ? { ...m, role } : m)));
    try {
      const res = await fetch("/api/workspace/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Failed to update role");
      }
    } catch (err) {
      setMembers(previous); // revert
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  function removeMember(member: Member) {
    if (!canManageMembers) return;
    if (member.email === session?.user.email) return;
    // Demo-only: there's no DELETE /api/workspace/members/:id endpoint
    // yet. Local removal only, for members added via the local invite flow.
    setMembers((prev) => prev.filter((m) => m.email !== member.email));
    if (detailEmail === member.email) setDetailEmail(null);
  }

  return (
    <div className="w-full space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-violet-950/30 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-violet-300/80">Workspace</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">Workspace settings</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Keep your team context clear. This workspace stays isolated and only visible to invited members.</p>
            </div>
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-2.5 text-violet-300">
              <ShieldCheck size={18} />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Workspace name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
            />
            <p className="mt-2 text-[11px] text-slate-500">Renaming the workspace isn't wired to the backend yet — there's no PATCH /api/workspace endpoint.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">Secure by default</span>
              <span className="rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1">Private workspace</span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Access</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">Members & roles</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">Invite teammates and manage who can edit, triage, or view feedback.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-2.5 text-slate-300">
              <Users2 size={18} />
            </div>
          </div>

          {error && <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p>}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-[11px] font-medium text-slate-400">
              <span className="font-mono text-slate-200">{members.length}</span> active members
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen((o) => !o)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-400"
            >
              <Plus size={13} /> Invite
            </button>
          </div>

          {inviteOpen && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="relative min-w-[180px] flex-1">
                <Mail size={13} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-8 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-violet-500/60"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 outline-none focus:border-violet-500/60"
              >
                <option value="ADMIN">Admin</option>
                <option value="ANALYST">Analyst</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button type="button" onClick={invite} className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400">
                Send invite
              </button>
            </div>
          )}

          <div className="mt-4 divide-y divide-slate-800/70">
            {members.map((m) => (
              <div key={m.email} className="space-y-2 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                    {m.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{m.name}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">{m.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${ROLE_STYLE[m.role].bg} ${ROLE_STYLE[m.role].text}`}>
                    {m.role}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailEmail(detailEmail === m.email ? null : m.email)}
                    className="shrink-0 text-slate-500 transition hover:text-slate-300"
                    aria-label="View member details"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {detailEmail === m.email ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-100">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.email}</p>
                      </div>
                      {canManageMembers && m.email !== session?.user.email ? (
                        <button
                          type="button"
                          onClick={() => removeMember(m)}
                          className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-400"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      ) : null}
                    </div>
                    {canManageMembers && m.id ? (
                      <label className="text-xs text-slate-400">
                        Role:{" "}
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as Role)}
                          className="ml-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="ANALYST">ANALYST</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </label>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Role: <span className="font-medium text-slate-100">{m.role}</span>
                      </p>
                    )}
                    <p className="mt-2 rounded-xl bg-slate-900/80 px-3 py-2 text-xs text-slate-400">
                      {session?.user.email === m.email ? "This is your logged-in profile." : "Only admins can change roles or remove members."}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
            {members.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No members loaded yet — sign in to see your workspace's team.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
