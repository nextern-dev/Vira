import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { json, readJson, withUser } from "@/lib/http";
import { appearanceSchema, parseOrThrow } from "@/lib/validation";
import { setAppearanceCookie } from "@/lib/auth/appearance-cookie";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = withUser(async ({ request, user }) => {
  const body = await readJson(request);
  const input = parseOrThrow(appearanceSchema, body);

  // Ownership comes exclusively from the authenticated session. No account id
  // is accepted from the request body or URL.
  await db
    .update(users)
    .set({
      appearanceMode: input.mode,
      colorTheme: input.theme,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  await setAppearanceCookie({ mode: input.mode, theme: input.theme });

  return json({
    ok: true,
    appearance: { mode: input.mode, theme: input.theme },
  });
});
