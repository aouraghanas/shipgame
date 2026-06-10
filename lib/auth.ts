import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveUserCapabilities } from "@/lib/permissions/resolve";

/**
 * Compute the compact capability list to embed in the JWT, plus whether this
 * user has any explicit customization (custom role or overrides). Page-access
 * enforcement only kicks in when `customized` is true, so un-customized users
 * are never affected.
 */
async function capsForUser(userId: string): Promise<{ caps: string[]; customized: boolean }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      customRoleId: true,
      permissionOverrides: true,
      customRole: { select: { capabilities: true } },
    },
  });
  if (!u) return { caps: [], customized: false };
  if (u.role === "ADMIN") return { caps: ["*"], customized: false };

  const ov = u.permissionOverrides as { grant?: unknown[]; deny?: unknown[] } | null;
  const hasOverrides =
    !!ov && ((Array.isArray(ov.grant) && ov.grant.length > 0) || (Array.isArray(ov.deny) && ov.deny.length > 0));
  const customized = Boolean(u.customRoleId) || hasOverrides;

  const caps = Array.from(
    resolveUserCapabilities({
      role: u.role,
      customRoleCapabilities: u.customRole?.capabilities ?? null,
      overrides: u.permissionOverrides,
    })
  );
  return { caps, customized };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || user.status === "INACTIVE") return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.avatarUrl = (user as unknown as { avatarUrl?: string }).avatarUrl ?? null;
        const c = await capsForUser(user.id);
        token.caps = c.caps;
        token.customized = c.customized;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.avatarUrl !== undefined) token.avatarUrl = session.avatarUrl;
        // Allow refreshing capabilities after an admin edits this user.
        if (token.id) {
          const c = await capsForUser(token.id as string);
          token.caps = c.caps;
          token.customized = c.customized;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null;
        session.user.capabilities = (token.caps as string[] | undefined) ?? null;
        session.user.customized = token.customized === true;
      }
      return session;
    },
  },
};
