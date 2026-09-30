import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { addChallenge, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { challenges, submissions, users } from "@/lib/db/schema";
import {
  deleteModule,
  getFirstModuleId,
  getModule,
  listModules,
  upsertModule,
  type ModuleDoc,
} from "@/lib/db/modules";

beforeEach(resetDb);
after(closeDb);

function mod(id: string, order: number, fields: Partial<ModuleDoc> = {}): ModuleDoc {
  return {
    id,
    syllabus_ref: "A1.1",
    title: `Title ${id}`,
    order,
    description: "desc",
    lesson_mdx: "# Lesson",
    ...fields,
  };
}

test("listModules sorts by order, then id; getFirstModuleId picks the first", async () => {
  await upsertModule(mod("module-03", 2));
  await upsertModule(mod("module-02", 2));
  await upsertModule(mod("module-01", 1));
  assert.deepEqual(
    (await listModules()).map((m) => m.id),
    ["module-01", "module-02", "module-03"]
  );
  assert.equal(await getFirstModuleId(), "module-01");
});

test("getFirstModuleId is null without modules", async () => {
  assert.equal(await getFirstModuleId(), null);
});

test("getModule returns the full module and rejects malformed ids", async () => {
  await upsertModule(mod("module-01", 1));
  assert.deepEqual(await getModule("module-01"), mod("module-01", 1));
  assert.equal(await getModule("missing"), null);
  assert.equal(await getModule("../etc"), null);
});

test("upsertModule overwrites an existing module", async () => {
  await upsertModule(mod("module-01", 1));
  await upsertModule(mod("module-01", 5, { title: "Шинэ", lesson_mdx: "new" }));
  assert.deepEqual(await getModule("module-01"), mod("module-01", 5, { title: "Шинэ", lesson_mdx: "new" }));
});

test("deleteModule removes its challenges and submissions but keeps earned XP", async () => {
  const db = getDb();
  await upsertModule(mod("module-01", 1));
  await addUser("u1", { total_xp: 40 });
  await addChallenge("ch-1", "module-01");
  await db.insert(submissions).values({ uid: "u1", challenge_id: "ch-1", passed: true });

  await deleteModule("module-01");

  assert.equal(await getModule("module-01"), null);
  assert.equal((await db.select().from(challenges)).length, 0);
  assert.equal((await db.select().from(submissions)).length, 0);
  const [u] = await db.select().from(users).where(eq(users.uid, "u1"));
  assert.equal(u.total_xp, 40);
});
