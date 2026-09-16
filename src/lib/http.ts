import { headers } from "next/headers";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";
import { describeError, log } from "@/lib/log";
import { rateWindowCount } from "@/lib/rate-limit";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string = "error",
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError(400, message, "bad_request", fields);
export const unauthorized = () =>
  new ApiError(401, "You need to sign in to continue.", "unauthorized");
export const forbidden = () =>
  new ApiError(403, "You do not have access to this resource.", "forbidden");
export const notFound = (what = "Resource") =>
  new ApiError(404, `${what} not found.`, "not_found");
export const conflict = (message: string) =>
  new ApiError(409, message, "conflict");
export const tooMany = (message = "Too many requests. Please slow down.") =>
  new ApiError(429, message, "rate_limited");

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return json(
      { error: error.message, code: error.code, fields: error.fields ?? null },
      error.status,
    );
  }
  log.error("unhandled_api_error", describeError(error));
  return json(
    { error: "Something went wrong on our side. Please try again.", code: "server_error" },
    500,
  );
}

/**
 * Cross-origin guard for state changing requests. Combined with the
 * SameSite=Lax session cookie this blocks classic CSRF.
 */
async function assertSameOrigin(request: Request): Promise<void> {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const headerList = await headers();
  const origin = headerList.get("origin");
  if (!origin) return; // same-origin fetches from some clients omit Origin

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) throw forbidden();

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden();
  }
  if (originHost !== host) {
    throw new ApiError(403, "Cross-origin request rejected.", "bad_origin");
  }
}

export type RouteParams = Record<string, string | string[] | undefined>;
export type RouteContext = { params: Promise<RouteParams> };

type Handler = (ctx: {
  request: Request;
  user: SessionUser;
  params: Promise<RouteParams>;
}) => Promise<Response>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Resolves a dynamic path segment and rejects anything that is not a UUID.
 * A bad id is a 404 — never an unhandled database cast error, and never an
 * oracle that tells an attacker whether the row exists.
 */
export async function pathId(
  params: Promise<RouteParams>,
  key = "id",
): Promise<string> {
  const resolved = await params;
  const raw = resolved[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !UUID_RE.test(value)) throw notFound();
  return value;
}

/** Wraps a route handler with auth, CSRF protection and error normalisation. */
export function withUser(handler: Handler) {
  return async (request: Request, context: RouteContext): Promise<Response> => {
    try {
      await assertSameOrigin(request);
      const user = await getCurrentUser();
      if (!user) throw unauthorized();
      return await handler({
        request,
        user,
        params: context?.params ?? Promise.resolve({}),
      });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function withPublic(handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    try {
      await assertSameOrigin(request);
      return await handler(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Parses a JSON body defensively (size + shape). */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw badRequest("Expected a JSON request body.");
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    throw badRequest("Could not read the request body.");
  }
  if (text.length > 20_000) throw badRequest("Request body is too large.");
  if (!text.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw badRequest("Expected a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw badRequest("Malformed JSON body.");
  }
}

/* ------------------------------------------------------------------ */
/* Rate limiting                                                       */
/* ------------------------------------------------------------------ */

/**
 * Counts requests for `key` and rejects when the window limit is exceeded.
 * Uses the shared Redis window when configured (multi-instance safe) and the
 * in-process window otherwise. See src/lib/rate-limit.ts.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<void> {
  const count = await rateWindowCount(key, windowMs);
  if (count > limit) {
    const seconds = Math.ceil(windowMs / 1000);
    log.warn("rate_limit_exceeded", { limit, windowSeconds: seconds });
    throw tooMany(`Too many attempts. Try again in a moment (window ${seconds}s).`);
  }
}

export async function clientKey(prefix: string): Promise<string> {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "local";
  return `${prefix}:${ip}`;
}
