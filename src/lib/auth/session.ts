import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { setAppearanceCookie } from "@/lib/auth/appearance-cookie";

export const SESSION_COOKIE = "vira_session";
const SESSION_TTL_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  currency: string;
  appearanceMode: "light" | "dark" | "system";
  colorTheme: "indigo" | "ocean" | "forest" | "graphite" | "berry";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);

  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));

  const [appearance] = await db.select({ mode: users.appearanceMode, theme: users.colorTheme }).from(users).where(eq(users.id, userId)).limit(1);
  const store = await cookies();
  const production = process.env.NODE_ENV === "production";
  const arenaPreview = process.env.ARENA_PREVIEW === "true";
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: production && arenaPreview ? "none" : "lax",
    secure: production,
    path: "/",
    expires: expiresAt,
  });
  if (appearance) await setAppearanceCookie(appearance);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 16 || token.length > 256) return null;
  try {
    const rows = await db.select({ id: users.id, email: users.email, name: users.name, currency: users.currency, appearanceMode: users.appearanceMode, colorTheme: users.colorTheme }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()))).limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function revokeOtherSessions(userId: string): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
    return;
  }
  await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(token))));
}

async function clearAuthJsCookies(): Promise<void> {
  const store = await cookies();
  for (const name of ["authjs.session-token", "__Secure-authjs.session-token"]) store.delete(name);
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try { await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))); } catch { /* best effort */ }
  }
  store.delete(SESSION_COOKIE);
  await clearAuthJsCookies();
}
