/**
 * Applies the SQL migrations in drizzle/. `--test` targets TEST_DATABASE_URL.
 * Run: npm run db:migrate
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  // Neon (Vercel) also sets DATABASE_URL_UNPOOLED: DDL goes over the direct
  // connection, not the transaction pooler.
  const target = process.argv.includes("--test")
    ? "TEST_DATABASE_URL"
    : process.env.DATABASE_URL_UNPOOLED
      ? "DATABASE_URL_UNPOOLED"
      : "DATABASE_URL";
  const url = process.env[target];
  if (!url) throw new Error(`${target} is not set (see .env.example).`);

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.log(`migrations applied to ${target}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
