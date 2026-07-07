/**
 * One-off fix for profiles created before the stable-uid auth fix.
 *
 * Pre-fix sign-ins minted a random UUID per sign-in, so one person could
 * have several user docs. Post-fix the uid is Google's numeric account id.
 * For each email that HAS a post-fix (non-UUID) doc, this merges all UUID
 * docs into it (max XP, union of modules, teacher role wins, submissions
 * copied) and deletes the UUID leftovers.
 *
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/migrate-duplicate-users.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { getDb } = await import("../src/lib/firebase/admin");
  const db = getDb();
  const snap = await db.collection("users").get();

  const byEmail = new Map<string, typeof snap.docs>();
  for (const doc of snap.docs) {
    const email = doc.data().email as string;
    byEmail.set(email, [...(byEmail.get(email) ?? []), doc]);
  }

  for (const [email, docs] of byEmail) {
    const target = docs.find((d) => !UUID_RE.test(d.id));
    const legacy = docs.filter((d) => UUID_RE.test(d.id));
    if (!target) {
      if (legacy.length) console.log(`skip ${email}: no post-fix doc yet (user must sign in first)`);
      continue;
    }
    if (legacy.length === 0) continue;

    const t = target.data();
    let xp = t.total_xp ?? 0;
    const modules = new Set<string>(t.unlocked_modules ?? []);
    let role = t.role ?? "student";

    for (const old of legacy) {
      const o = old.data();
      xp = Math.max(xp, o.total_xp ?? 0);
      for (const m of o.unlocked_modules ?? []) modules.add(m);
      if (o.role === "teacher") role = "teacher";

      const subs = await old.ref.collection("submissions").get();
      for (const sub of subs.docs) {
        const existing = await target.ref.collection("submissions").doc(sub.id).get();
        if (!existing.exists) {
          await target.ref.collection("submissions").doc(sub.id).set(sub.data());
        }
      }
      await db.recursiveDelete(old.ref);
      console.log(`merged+deleted ${old.id} → ${target.id} (${email})`);
    }

    await target.ref.update({ total_xp: xp, unlocked_modules: [...modules], role });
    console.log(`${email}: xp=${xp}, modules=[${[...modules]}], role=${role}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
