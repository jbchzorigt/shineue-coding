/**
 * TEMP dev helper: creates a profile for a fake student and prints a valid
 * session cookie for local UI testing (bypasses Google sign-in).
 * --teacher makes the fake user a teacher; --cleanup deletes it instead.
 * Run: npm run script -- scripts/make-test-session.ts [--teacher | --cleanup]
 */
import { encode } from "next-auth/jwt";
import { closeDb } from "../src/lib/db/client";
import { deleteUserCascade, ensureUserProfile, updateUserRole } from "../src/lib/db/users";
import { getAuthState } from "../src/lib/db/accounts";

const UID = "ui-test-student";
const EMAIL = "ui-test@shineue.edu.mn";
const NAME = "Тест Сурагч";

async function main() {
  if (process.argv.includes("--cleanup")) {
    await deleteUserCascade(UID);
    console.log("deleted", UID, "(incl. submissions, certificates, contest entries)");
    return;
  }

  await ensureUserProfile({ uid: UID, email: EMAIL, name: NAME, photo_url: null });

  const role = process.argv.includes("--teacher") ? "teacher" : "student";
  // Staff checks read the database role, not the JWT copy — keep both in sync.
  await updateUserRole(UID, role);

  // The proxy ends sessions whose version no longer matches the row.
  const state = await getAuthState(UID);
  const cookie = await encode({
    token: { sub: UID, name: NAME, email: EMAIL, role, sv: state?.session_version ?? 0 },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
  });
  console.log(cookie);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
