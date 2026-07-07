/**
 * Sets a user's role by email.
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/set-role.ts <email> <student|teacher|admin>
 *
 * Note: the role is copied into the session JWT at sign-in, so the user
 * must sign out and back in to see the change in the UI.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !["student", "teacher", "admin"].includes(role)) {
    console.error('Usage: npx tsx scripts/set-role.ts <email> <student|teacher|admin>');
    process.exit(1);
  }

  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { getDb } = await import("../src/lib/firebase/admin");
  const snap = await getDb().collection("users").where("email", "==", email).get();
  if (snap.empty) {
    console.error(`No user with email ${email} — they must sign in once first.`);
    process.exit(1);
  }
  for (const doc of snap.docs) {
    await doc.ref.update({ role });
    console.log(`${email} (${doc.id}) → role=${role}`);
  }
  console.log("Note: the user must sign out/in for the UI to reflect the new role.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
