import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { listStudentOverviews } from "@/lib/db/teacher";

beforeEach(resetDb);
after(closeDb);

test("listStudentOverviews aggregates per student, highest XP first", async () => {
  await addModule("module-01", 1);
  await addChallenge("ch-1", "module-01");
  await addChallenge("ch-2", "module-01", { order: 2 });
  await addUser("s1", { total_xp: 10, unlocked_modules: ["module-01"], class_name: "11A" });
  await addUser("s2", { total_xp: 30, unlocked_modules: ["module-01", "module-02"] });
  await addUser("t1", { role: "teacher", total_xp: 99 });
  await getDb().insert(submissions).values([
    { uid: "s1", challenge_id: "ch-1", passed: true, attempts: 2, hint_used: true },
    { uid: "s1", challenge_id: "ch-2", passed: false, attempts: 3 },
  ]);

  const rows = await listStudentOverviews();
  assert.deepEqual(rows.map((r) => r.uid), ["s2", "s1"]);

  const [s2, s1] = rows;
  assert.deepEqual(
    { ...s1, last_login: null },
    {
      uid: "s1",
      name: "s1",
      email: "s1@shineue.edu.mn",
      class_name: "11A",
      role: "student",
      total_xp: 10,
      unlocked_count: 1,
      passed_count: 1,
      total_attempts: 5,
      hints_used: 1,
      locked: false,
      last_login: null,
    }
  );
  assert.match(s1.last_login ?? "", /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(s2.passed_count, 0);
  assert.equal(s2.total_attempts, 0);
  assert.equal(s2.hints_used, 0);
  assert.equal(s2.unlocked_count, 2);
});

test("includeStaff also lists teachers", async () => {
  await addUser("s1");
  await addUser("t1", { role: "teacher" });
  assert.deepEqual((await listStudentOverviews()).map((r) => r.uid), ["s1"]);
  assert.deepEqual((await listStudentOverviews(true)).map((r) => r.uid).sort(), ["s1", "t1"]);
});

test("locked accounts are flagged until the lock expires", async () => {
  await addUser("s1", { locked_until: new Date(Date.now() + 60_000) });
  await addUser("s2", { locked_until: new Date(Date.now() - 60_000) });
  const rows = await listStudentOverviews();
  assert.deepEqual(
    rows.map((r) => [r.uid, r.locked]).sort(),
    [
      ["s1", true],
      ["s2", false],
    ]
  );
});
