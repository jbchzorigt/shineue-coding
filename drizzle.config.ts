import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns schema changes into SQL under drizzle/.
// Migrations are applied by scripts/migrate.ts, not drizzle-kit.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
