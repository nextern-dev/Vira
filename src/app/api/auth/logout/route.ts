import { destroyCurrentSession } from "@/lib/auth/session";
import { json, withPublic } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withPublic(async () => {
  await destroyCurrentSession();
  return json({ ok: true, redirect: "/login" });
});
