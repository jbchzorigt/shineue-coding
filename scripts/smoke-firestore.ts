/**
 * Firestore smoke test — verifies ensureUserProfile against the real project.
 * Creates a throwaway user doc, checks first/repeat sign-in behavior, deletes it.
 *
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/smoke-firestore.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

async function main() {
  // Load .env.local (tsx does not do this automatically).
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { ensureUserProfile, getUserProfile } = await import("../src/lib/firebase/users");
  const { getDb } = await import("../src/lib/firebase/admin");
  const { FIRST_MODULE_ID } = await import("../src/lib/constants");

  const uid = `smoke-test-${Date.now()}`;
  const params = {
    uid,
    email: "smoke-test@shineue.edu.mn",
    name: "Smoke Test",
    photo_url: null,
  };

  try {
    // 1. First sign-in: fresh profile.
    const first = await ensureUserProfile(params);
    assert.equal(first.total_xp, 0, "new user starts with 0 XP");
    assert.deepEqual(first.unlocked_modules, [FIRST_MODULE_ID], "only module 1 unlocked");
    assert.equal(first.role, "student", "default role is student");
    console.log("✓ first sign-in creates profile: 0 XP, student, only", FIRST_MODULE_ID);

    // 2. Simulate earned progress, then sign in again.
    await getDb().collection("users").doc(uid).update({
      total_xp: 150,
      unlocked_modules: [FIRST_MODULE_ID, "module-02"],
    });
    const again = await ensureUserProfile({ ...params, name: "Smoke Test Renamed" });
    assert.equal(again.total_xp, 150, "repeat sign-in must not reset XP");
    assert.deepEqual(again.unlocked_modules, [FIRST_MODULE_ID, "module-02"], "repeat sign-in must not reset unlocked modules");
    assert.equal(again.name, "Smoke Test Renamed", "profile fields refresh on sign-in");
    console.log("✓ repeat sign-in preserves progress, refreshes name");

    // 3. getUserProfile round-trip.
    const fetched = await getUserProfile(uid);
    assert.equal(fetched?.total_xp, 150);
    console.log("✓ getUserProfile reads the doc back");
  } finally {
    await getDb().collection("users").doc(uid).delete();
    console.log("✓ test doc cleaned up");
  }

  console.log("\nAll Firestore smoke tests passed against project:", process.env.FIREBASE_PROJECT_ID);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
