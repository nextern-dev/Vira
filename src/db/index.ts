import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __viraPostgresqlPool?: Pool;
};

/**
 * Reuse the PostgreSQL pool across warm serverless invocations.
 * Creating a new Pool for every Vercel function invocation causes connection
 * churn and adds avoidable database latency, especially on Neon.
 */
const normalizedDatabaseUrl = databaseUrl.replace(
  /([?&])sslmode=(?:prefer|require|verify-ca)(?=(&|$))/i,
  "$1sslmode=verify-full",
);

const ssl = normalizedDatabaseUrl.includes("sslmode=verify-full")
  ? { rejectUnauthorized: true }
  : undefined;

export const pool =
  globalForDb.__viraPostgresqlPool ??
  new Pool({
    connectionString: normalizedDatabaseUrl,
    ssl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

globalForDb.__viraPostgresqlPool = pool;

export const db = drizzle(pool);
