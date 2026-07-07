/**
 * Lists all user documents in Firestore.
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/list-users.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { getDb } = await import("../src/lib/firebase/admin");
  const snap = await getDb().collection("users").get();
  console.log("users collection:", snap.size, "document(s)");
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(
      `- ${doc.id}: ${d.email} | role=${d.role} | xp=${d.total_xp} | modules=${JSON.stringify(d.unlocked_modules)}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
