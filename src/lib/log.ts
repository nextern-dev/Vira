/**
 * Minimal structured server logging.
 *
 * Emits single-line JSON so any collector (Vercel logs, CloudWatch, Loki,
 * Sentry transports) can parse it without custom instrumentation. Kept
 * dependency-free on purpose; integrate a dedicated APM only if you need
 * tracing beyond request-level errors.
 */

type Level = "info" | "warn" | "error";

type Meta = Record<string, unknown>;

function emit(level: Level, event: string, meta: Meta = {}): void {
  const line = JSON.stringify({
    level,
    event,
    ts: new Date().toISOString(),
    pid: process.pid,
    ...meta,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** Never log secrets — pass only low-cardinality, non-sensitive metadata. */
export const log = {
  info: (event: string, meta?: Meta) => emit("info", event, meta),
  warn: (event: string, meta?: Meta) => emit("warn", event, meta),
  error: (event: string, meta?: Meta) => emit("error", event, meta),
};

export function describeError(error: unknown): Meta {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 300) };
  }
  return { type: typeof error };
}
