// lib/auth-config.ts
//
// NextAuth (Auth.js) v4 options, shared between the /api/auth/[...nextauth]
// route handler and any server component that calls getServerSession().

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

// Augment the default session/JWT shapes so workspaceId and role travel
// with every session — this is what lets the auth guard inject tenancy
// scoping without a DB round-trip on every request.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
      workspaceId: string;
      workspaceName: string;
    };
  }
  interface User {
    id: string;
    role: Role;
    workspaceId: string;
    workspaceName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    workspaceId: string;
    workspaceName: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { workspace: { select: { name: true } } },
        });

        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace.name,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in and whenever the session is checked. We persist
    // workspaceId + role onto the JWT so every subsequent request can
    // read tenancy scope from the token, without hitting the DB.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.workspaceName = user.workspaceName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.workspaceId = token.workspaceId;
      session.user.workspaceName = token.workspaceName;
      return session;
    },
  },
};
