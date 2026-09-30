/**
 * Sets a user's role by email.
 * Run: npm run script -- scripts/set-role.ts <email> <student|teacher|admin>
 * Takes effect on the user's next request (sessions re-read the role).
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import type { UserRole } from "../src/lib/types";

const ROLES: UserRole[] = ["student", "teacher", "admin"];

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as UserRole)) {
    console.error("Usage: npm run script -- scripts/set-role.ts <email> <student|teacher|admin>");
    process.exitCode = 1;
    return;
  }

  const updated = await getDb()
    .update(users)
    .set({ role: role as UserRole })
    .where(eq(users.email, email))
    .returning({ uid: users.uid });
  if (updated.length === 0) {
    console.error(`No user with email ${email} — they must sign in once first.`);
    process.exitCode = 1;
    return;
  }
  for (const u of updated) console.log(`${email} (${u.uid}) → role=${role}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
