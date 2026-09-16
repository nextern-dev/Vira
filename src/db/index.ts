import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/**
 * TLS handling for production managed databases.
 *
 * node-postgres already honours `sslmode` inside DATABASE_URL. For providers
 * such as Neon/RDS that require TLS without a local CA bundle, append
 * `sslmode=require` to the URL; set `DB_SSL_REJECT_UNAUTHORIZED=false` when
 * the provider uses a certificate chain not trusted by the base image.
 */
const ssl = databaseUrl.includes("sslmode=require")
  ? {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
    }
  : undefined;

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
