import { json, readJson, withPublic } from "@/lib/http";
import { setAppearanceCookie } from "@/lib/auth/appearance-cookie";
import { appearanceSchema, parseOrThrow } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Guest appearance preference. It stores only two allow-listed presentation
 * values in an httpOnly cookie; it cannot access or mutate account data.
 */
export const PATCH = withPublic(async (request) => {
  const body = await readJson(request);
  const appearance = parseOrThrow(appearanceSchema, body);
  await setAppearanceCookie(appearance);
  return json({ ok: true, appearance });
});
