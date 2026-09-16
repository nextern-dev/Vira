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

async function linkGoogleAccount(
  email: string,
  displayName: string | null,
  imageUrl: string | null,
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
          avatarUrl: imageUrl,
          passwordHash: null,
          provider: "google",
          emailVerifiedAt: new Date(),
        })
        .returning({ id: users.id });
      userId = created.id;
    } else if (imageUrl) {
      await db.update(users).set({ avatarUrl: imageUrl, updatedAt: new Date() }).where(eq(users.id, userId));
    }

    await createSession(userId);
    return true;
  } catch (error) {
    log.error("oauth_link_failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

const authSecret = process.env.AUTH_SECRET?.trim();
if (process.env.NODE_ENV === "production" && !authSecret) {
  throw new Error("AUTH_SECRET must be configured in production.");
}

const config: NextAuthConfig = {
  trustHost: true,
  // Never use a predictable production fallback. Development keeps a clearly
  // non-production value so local setup remains convenient.
  secret: authSecret ?? "dev-only-secret-change-me",
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return "/login?error=oauth_no_email";

      // Do not auto-link an OAuth identity merely because an email string is
      // present. Google must explicitly attest that the email is verified.
      const emailVerified =
        profile && "email_verified" in profile ? profile.email_verified === true : false;
      if (!emailVerified) return "/login?error=oauth_email_unverified";

      const ok = await linkGoogleAccount(
        email,
        user.name ?? null,
        typeof user.image === "string" ? user.image : null,
      );
      return ok ? "/dashboard" : "/login?error=oauth_link_failed";
    },
    async session({ session }) {
      const email = session.user?.email?.toLowerCase().trim();
      if (!email) return session;

      const [user] = await db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (user?.avatarUrl) {
        session.user.image = user.avatarUrl;
      } else if (session.user.image) {
        await db
          .update(users)
          .set({ avatarUrl: session.user.image, updatedAt: new Date() })
          .where(eq(users.email, email));
      }

      return session;
    },
  },
};

export const { handlers: authHandlers, auth, signIn, signOut } = NextAuth(config);
