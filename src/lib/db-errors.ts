/**
 * Drizzle wraps driver errors, so the Postgres `code` lives on the cause
 * chain. Walk it instead of trusting the top-level error shape.
 */
function pgCode(error: unknown, depth = 0): string | null {
  if (!error || typeof error !== "object" || depth > 4) return null;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return pgCode(candidate.cause, depth + 1);
}

export const isUniqueViolation = (error: unknown) => pgCode(error) === "23505";
