import "server-only";

import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

/**
 * All database access goes through this server-side client — the browser
 * never talks to Postgres. Grading/XP writes stay server-authoritative.
 */
export type Db = PostgresJsDatabase<typeof schema>;

// Survives dev hot reloads, so each reload does not open a new pool.
const globalForDb = globalThis as unknown as {
  __codingDb?: { db: Db; client: ReturnType<typeof postgres> };
};

/** Lazy singleton so importing this module never throws at build time. */
export function getDb(): Db {
  if (!globalForDb.__codingDb) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "Database is not configured: set DATABASE_URL in .env.local (see .env.example) and run `npm run db:up`."
      );
    }
    // prepare: false — Neon's pooler (PgBouncer) in production; harmless locally.
    const client = postgres(url, { max: 10, prepare: false, onnotice: () => {} });
    globalForDb.__codingDb = { client, db: drizzle(client, { schema }) };
  }
  return globalForDb.__codingDb.db;
}

/** Closes the pool (scripts and tests; the app keeps it open). */
export async function closeDb(): Promise<void> {
  const cached = globalForDb.__codingDb;
  globalForDb.__codingDb = undefined;
  await cached?.client.end();
}

type PgErrorFields = { code?: unknown; constraint_name?: unknown };

/** SQLSTATE and constraint of a failed query — Drizzle wraps the driver error in `cause`. */
function pgError(err: unknown): { code?: string; constraint?: string } {
  const e = err as (PgErrorFields & { cause?: PgErrorFields }) | null;
  const src = e?.cause?.code !== undefined ? e.cause : e;
  return {
    code: typeof src?.code === "string" ? src.code : undefined,
    constraint: typeof src?.constraint_name === "string" ? src.constraint_name : undefined,
  };
}

/** `constraint` narrows the check to one named FK (see drizzle/*.sql). */
export function isForeignKeyViolation(err: unknown, constraint?: string): boolean {
  const e = pgError(err);
  return e.code === "23503" && (constraint === undefined || e.constraint === constraint);
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const e = pgError(err);
  return e.code === "23505" && (constraint === undefined || e.constraint === constraint);
}
