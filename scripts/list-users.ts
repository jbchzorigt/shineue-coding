/**
 * Lists all users.
 * Run: npm run script -- scripts/list-users.ts
 */
import { asc } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

async function main() {
  const rows = await getDb().select().from(users).orderBy(asc(users.email));
  console.log("users table:", rows.length, "row(s)");
  for (const u of rows) {
    console.log(
      `- ${u.uid}: ${u.email} | role=${u.role} | xp=${u.total_xp} | modules=${JSON.stringify(u.unlocked_modules)}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
