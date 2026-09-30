import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  addChallenge,
  addModule,
  addUser,
  assertTestDatabaseName,
  assertTestDatabaseUrl,
  resetDb,
} from "@/lib/db/test-helpers";
import { closeDb, getDb, isForeignKeyViolation } from "@/lib/db/client";
import { challengeAnswers, challenges, modules, submissions } from "@/lib/db/schema";
import { newId } from "@/lib/db/ids";

beforeEach(resetDb);
after(closeDb);

test("assertTestDatabaseUrl only accepts *_test databases", () => {
  assert.throws(() => assertTestDatabaseUrl(undefined));
  assert.throws(() => assertTestDatabaseUrl("postgres://u:p@127.0.0.1:5433/coding"));
  assert.equal(
    assertTestDatabaseUrl("postgres://u:p@127.0.0.1:5433/coding_test"),
    "postgres://u:p@127.0.0.1:5433/coding_test"
  );
});

test("resetDb double-checks the connected database is a *_test one", () => {
  assert.throws(() => assertTestDatabaseName("coding"));
  assert.doesNotThrow(() => assertTestDatabaseName("coding_test"));
});

test("newId returns distinct 20-character alphanumeric ids", () => {
  const a = newId();
  assert.match(a, /^[A-Za-z0-9]{20}$/);
  assert.notEqual(a, newId());
});

test("deleting a module cascades to challenges, answers and submissions", async () => {
  const db = getDb();
  await addModule("module-01", 1);
  await addUser("u1");
  await addChallenge("ch-1", "module-01");
  await db.insert(challengeAnswers).values({ challenge_id: "ch-1", hint: "h" });
  await db.insert(submissions).values({ uid: "u1", challenge_id: "ch-1", passed: true });

  await db.delete(modules).where(eq(modules.id, "module-01"));

  assert.equal((await db.select().from(challenges)).length, 0);
  assert.equal((await db.select().from(challengeAnswers)).length, 0);
  assert.equal((await db.select().from(submissions)).length, 0);
});

test("isForeignKeyViolation recognises FK errors only", async () => {
  const err = await addChallenge("ch-x", "no-such-module").catch((e: unknown) => e);
  assert.equal(isForeignKeyViolation(err), true);
  assert.equal(isForeignKeyViolation(new Error("boom")), false);
});
