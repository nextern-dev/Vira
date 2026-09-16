"use client";

export type ApiFailure = {
  ok: false;
  error: string;
  fields: Record<string, string>;
  status: number;
};
export type ApiSuccess<T> = { ok: true; data: T };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export async function apiFetch<T = unknown>(
  url: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        accept: "application/json",
        ...(init.headers ?? {}),
      },
      credentials: "same-origin",
    });

    const text = await response.text();
    const payload: unknown = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const body = payload as { error?: string; fields?: Record<string, string> };
      return {
        ok: false,
        status: response.status,
        error: body?.error ?? "Something went wrong. Please try again.",
        fields: body?.fields ?? {},
      };
    }
    return { ok: true, data: payload as T };
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Network problem — check your connection and try again.",
      fields: {},
    };
  }
}

/** RFC4122-ish idempotency key, works without crypto.randomUUID. */
export function requestId(): string {
  const c = globalThis.crypto;
  if (c && "randomUUID" in c) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function todayLocalIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
