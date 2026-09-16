import { json } from "@/lib/http";
import { authHandlers, googleConfigured } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * OAuth entry point (Google). Auth.js owns CSRF/state for the OAuth leg;
 * on success the callback creates our own vira_session (see src/auth.ts).
 * When Google credentials are not configured every attempt fails closed.
 */
async function handle(request: Request): Promise<Response> {
  if (!googleConfigured()) {
    return json(
      {
        error: "Google sign-in is not configured on this deployment.",
        code: "oauth_unavailable",
      },
      503,
    );
  }
  const nextRequest = request as unknown as Parameters<typeof authHandlers.GET>[0];
  return request.method === "POST" ? authHandlers.POST(nextRequest) : authHandlers.GET(nextRequest);
}

export const GET = handle;
export const POST = handle;
