import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The database is optional: without DATABASE_URL the whole practice app still works
 * (questions, PYQ papers, AI generation, flashcards) and progress is kept in the browser.
 * Sign-in is the only feature that needs Postgres.
 */
const candidates = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.POSTGRES_PRISMA_URL, process.env.POSTGRES_URL_NON_POOLING];
const databaseUrl = (candidates.find((v) => typeof v === "string" && v.trim().length > 0) ?? "").trim();

export const hasDatabase = databaseUrl.length > 0;

const isLocal = /(localhost|127\.0\.0\.1|::1)/.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl || "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
    // hosted providers (Neon, Supabase, Vercel Postgres, Render…) need TLS
    ssl: !databaseUrl || isLocal || /sslmode=/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// a dropped idle connection must never crash the server / crash the browser page
pool.on("error", (err) => {
  console.error("postgres pool error", err.message);
});

export const db = drizzle(pool);
