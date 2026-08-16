// The original AppLayout was a client component that read a fake
// "loopDemoSession" key out of localStorage to decide what workspace
// name / role / initials to show -- nothing set that key on a real
// login, and middleware.ts didn't exist, so the whole (app) section
// was reachable by anyone regardless of auth state. This is now a
// server component that reads the actual NextAuth session (already
// enforced by middleware.ts before this even renders).

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { Sidebar } from "@/components/nav/Sidebar";
import { Topbar } from "@/components/nav/Topbar";
import { MobileBottomNav } from "@/components/nav/MobileNav";

const BRAND = "Customer Feedback Intelligence Platform";

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // middleware.ts already redirects unauthenticated requests to /login
  // before this renders, so session is expected to be present here.
  const session = await getServerSession(authOptions);
  const workspaceName = session?.user.workspaceName ?? "";
  const role = session?.user.role ?? "VIEWER";
  const initials = session?.user.name ? initialsFor(session.user.name) : "";

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="flex w-full">
        <Sidebar workspaceName={workspaceName} role={role} brandName={BRAND} />
        <div className="min-w-0 flex-1">
          <Topbar role={role} initials={initials} brandName={BRAND} />
          <main className="fade-in px-4 py-5 pb-20 sm:px-6 sm:py-6 md:pb-6">{children}</main>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
