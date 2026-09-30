import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { getUserProfile } from "@/lib/db/users";
import { canOpenModule, newlyOpenedModule, openModules } from "@/lib/progression";

beforeEach(resetDb);
after(closeDb);

test("a module added after sign-up opens and is saved to the profile", async () => {
  await addModule("module-01", 1);
  await addChallenge("c1", "module-01");
  await addUser("u1", { unlocked_modules: ["module-01"] });
  // Added later by a teacher, with the same order number as module-01.
  await addModule("test", 1);

  const open = await openModules("u1", ["module-01"]);
  assert.deepEqual(open.map((m) => m.id), ["module-01", "test"]);
  assert.equal(open[1].title, "test");
  assert.deepEqual((await getUserProfile("u1"))?.unlocked_modules, ["module-01", "test"]);
});

test("the next module opens only after every challenge before it is passed", async () => {
  await addModule("module-01", 1);
  await addModule("module-02", 2);
  await addChallenge("c1", "module-01");
  await addUser("u1", { unlocked_modules: ["module-01"] });

  assert.deepEqual((await openModules("u1", ["module-01"])).map((m) => m.id), ["module-01"]);
  await getDb().insert(submissions).values({ uid: "u1", challenge_id: "c1", passed: true });
  assert.deepEqual((await openModules("u1", ["module-01"])).map((m) => m.id), [
    "module-01",
    "module-02",
  ]);
});

test("canOpenModule: staff open everything, students what they reached", async () => {
  await addModule("module-01", 1);
  await addModule("module-02", 2);
  await addChallenge("c1", "module-01");
  await addUser("s1", { unlocked_modules: ["module-01"] });
  await addUser("t1", { role: "teacher" });

  const student = await getUserProfile("s1");
  const teacher = await getUserProfile("t1");
  assert.equal(await canOpenModule(student, "module-01"), true);
  assert.equal(await canOpenModule(student, "module-02"), false);
  assert.equal(await canOpenModule(teacher, "module-02"), true);
  assert.equal(await canOpenModule(null, "module-01"), false);
});

test("newlyOpenedModule names the module a passed submission just opened", async () => {
  await addModule("module-01", 1);
  await addModule("module-02", 2);
  await addChallenge("c1", "module-01");
  await addUser("u1", { unlocked_modules: ["module-01"] });

  const before = await openModules("u1", ["module-01"]);
  assert.equal(await newlyOpenedModule("u1", before), null);
  await getDb().insert(submissions).values({ uid: "u1", challenge_id: "c1", passed: true });
  assert.deepEqual(await newlyOpenedModule("u1", before), { id: "module-02", title: "module-02" });
});
