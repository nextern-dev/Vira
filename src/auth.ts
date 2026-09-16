import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth/session";
import { log } from "@/lib/log";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Links a Google identity to a Vira account, creating one when needed, then
 * issues the product's own opaque vira_session. Auth.js performs the OAuth
 * leg only — Vira sessions remain the single source of truth for authz.
 */
async function linkGoogleAccount(
  email: string,
  displayName: string | null,
): Promise<boolean> {
  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      const name = (displayName ?? "").trim().slice(0, 80) || email.split("@")[0]!;
      const [created] = await db
        .insert(users)
        .values({
          email,
          name,
          passwordHash: null,
          provider: "google",
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id });
      userId = created.id;
    }

    await createSession(userId);
    return true;
  } catch (error) {
    log.error("oauth_link_failed", { message: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

const config: NextAuthConfig = {
  // trustHost is required when serving behind a proxy (Arena preview / Vercel).
  trustHost: true,
  secret: process.env.AUTH_SECRET ?? "dev-only-change-me-with-AUTH_SECRET",
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return "/login?error=oauth_no_email";
      const ok = await linkGoogleAccount(email, user.name ?? null);
      return ok ? "/dashboard" : "/login?error=oauth_link_failed";
    },
  },
};

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(config);
