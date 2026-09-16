import { log } from "@/lib/log";

/**
 * Rate-window counter with a shared-store upgrade path.
 *
 * If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are configured, counts
 * live in Redis (atomic INCR + single EXPIRE), so limits hold across every
 * replica. With no Redis configured — local development and single-instance
 * deployments — it falls back to a bounded in-process map.
 */

type Bucket = { count: number; resetAt: number };
const globalForLimiter = globalThis as typeof globalThis & {
  __viraRateBuckets?: Map<string, Bucket>;
};
const buckets = (globalForLimiter.__viraRateBuckets ??= new Map());

let warnedAboutRedisFailure = false;

function localIncrement(key: string, windowMs: number): number {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  bucket.count += 1;
  return bucket.count;
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

async function redisIncrement(key: string, windowMs: number): Promise<number> {
  const config = redisConfig();
  if (!config) throw new Error("redis not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const encodedKey = encodeURIComponent(`rl:${key}`);
    const response = await fetch(`${config.url}/incr/${encodedKey}`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.token}` },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`upstash incr ${response.status}`);

    const body = (await response.json()) as { result?: unknown };
    const count = Number(body.result);
    if (!Number.isFinite(count)) throw new Error("upstash incr bad payload");

    if (count === 1) {
      const ttl = await fetch(`${config.url}/expire/${encodedKey}/${Math.ceil(windowMs / 1000)}`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}` },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!ttl.ok) throw new Error(`upstash expire ${ttl.status}`);
    }
    return count;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns the request count for this key inside its current window.
 * Redis failure degrades to the local limiter rather than taking auth flows
 * offline; the degradation is logged once per process.
 */
export async function rateWindowCount(key: string, windowMs: number): Promise<number> {
  try {
    return await redisIncrement(key, windowMs);
  } catch (error) {
    if (redisConfig() && !warnedAboutRedisFailure) {
      warnedAboutRedisFailure = true;
      log.warn("rate_limit_redis_unavailable", {
        fallback: "in_process",
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    return localIncrement(key, windowMs);
  }
}
