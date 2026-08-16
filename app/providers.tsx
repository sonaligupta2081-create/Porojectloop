"use client";

// The frontend's AuthForm already calls next-auth/react's signIn(), but
// that hook requires a <SessionProvider> somewhere above it in the tree.
// The original frontend-only build never added one (it had no real auth
// to provide a session for). This wraps the whole app so both signIn()
// and useSession() work anywhere in the client tree.

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
