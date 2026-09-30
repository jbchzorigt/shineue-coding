/**
 * Creates the super admin (SUPER_ADMIN_EMAIL), or resets its password when
 * it is forgotten, and prints a one-time temporary password. The admin
 * must choose their own password at first sign-in.
 * Run: npm run script -- scripts/create-admin.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertSuperAdmin } from "../src/lib/db/accounts";
import { SUPER_ADMIN_EMAIL } from "../src/lib/constants";

async function main() {
  const tempPassword = await upsertSuperAdmin(SUPER_ADMIN_EMAIL);
  console.log(`Super admin: ${SUPER_ADMIN_EMAIL}`);
  console.log(`Temporary password (shown once): ${tempPassword}`);
  console.log("Sign in at /login, then choose your own password.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
