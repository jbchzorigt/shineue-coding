/**
 * TEMP dev helper: creates a Firestore profile for a fake student and prints
 * a valid session cookie for local UI testing (bypasses Google sign-in).
 * Pass --cleanup to delete the fake student instead.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const UID = "ui-test-student";

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  if (process.argv.includes("--cleanup")) {
    const { getDb } = await import("../src/lib/firebase/admin");
    const db = getDb();
    // Subcollections are not deleted with the parent doc.
    await db.recursiveDelete(db.collection("users").doc(UID));
    const certs = await db.collection("certificates").where("uid", "==", UID).get();
    await Promise.all(certs.docs.map((d) => d.ref.delete()));
    console.log("deleted", UID, `(incl. submissions, ${certs.size} certificate(s))`);
    return;
  }

  const { ensureUserProfile } = await import("../src/lib/firebase/users");
  await ensureUserProfile({
    uid: UID,
    email: "ui-test@shineue.edu.mn",
    name: "Тест Сурагч",
    photo_url: null,
  });

  const { encode } = await import("next-auth/jwt");
  const role = process.argv.includes("--teacher") ? "teacher" : "student";
  const cookie = await encode({
    token: { sub: UID, name: "Тест Сурагч", email: "ui-test@shineue.edu.mn", role },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
  });
  console.log(cookie);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
