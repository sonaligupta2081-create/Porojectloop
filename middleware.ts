// middleware.ts
//
// The original frontend-only build had no server-side route protection
// at all — anyone could open /dashboard, /inbox, etc. directly without
// signing in, because AppLayout only *read* a demo session from
// localStorage for display, it never gated access. This middleware
// enforces auth the way the rest of the app already enforces tenancy:
// server-side, not by hiding a link.

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const isLoggedIn = !!req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");

    // Signed-in users don't need to see the login/signup screens again.
    if (isLoggedIn && isAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Only require a token for the protected app routes below;
      // /login, /signup, and /api/auth/* must stay reachable while
      // signed out, or nobody could ever sign in.
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const isProtected =
          path.startsWith("/dashboard") ||
          path.startsWith("/inbox") ||
          path.startsWith("/trends") ||
          path.startsWith("/ask") ||
          path.startsWith("/reports") ||
          path.startsWith("/settings");
        if (!isProtected) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/inbox/:path*", "/trends/:path*", "/ask/:path*", "/reports/:path*", "/settings/:path*", "/login", "/signup"],
};
