import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { challengeAnswers, submissions } from "@/lib/db/schema";
import {
  deleteChallenge,
  getChallenge,
  getChallengePrivate,
  listChallengesByModule,
  upsertChallenge,
} from "@/lib/db/challenges";
import { UserError } from "@/lib/errors";
import type { Challenge, ChallengePrivate } from "@/lib/types";

beforeEach(async () => {
  await resetDb();
  await addModule("module-01", 1);
});
after(closeDb);

const coding: Challenge = {
  id: "ch-sum",
  module_id: "module-01",
  type: "coding",
  title: "Нийлбэр",
  prompt: "a + b",
  xp_reward: 10,
  order: 1,
  language: "python",
  starter_code: "a = int(input())",
  public_test_cases: [{ input: "1\n2", expected_output: "3" }],
  has_hint: true,
};
const codingPrivate: ChallengePrivate = {
  hidden_test_cases: [{ input: "5\n5", expected_output: "10" }],
  hint: "print(a + b)",
};

test("getChallenge returns only the public half", async () => {
  await upsertChallenge(coding, codingPrivate);
  const got = await getChallenge("ch-sum");
  assert.deepEqual(got, { ...coding, options: undefined, logic_spec: undefined });
  for (const secret of ["hidden_test_cases", "hint", "correct_answer_index", "expected_answer", "mark_scheme", "expected_table"]) {
    assert.equal(secret in (got as object), false, `${secret} leaked`);
  }
});

test("getChallengePrivate returns the secret half", async () => {
  await upsertChallenge(coding, codingPrivate);
  assert.deepEqual(await getChallengePrivate("ch-sum"), {
    ...codingPrivate,
    correct_answer_index: undefined,
    expected_answer: undefined,
    mark_scheme: undefined,
    expected_table: undefined,
  });
  assert.equal(await getChallengePrivate("missing"), null);
});

test("upsertChallenge replaces the whole challenge — removed fields are cleared", async () => {
  await upsertChallenge(coding, codingPrivate);
  await upsertChallenge({ ...coding, has_hint: undefined, title: "Шинэ" }, { hidden_test_cases: [] });

  const pub = await getChallenge("ch-sum");
  assert.equal(pub?.title, "Шинэ");
  assert.equal(pub?.has_hint, undefined);
  assert.equal((await getChallengePrivate("ch-sum"))?.hint, undefined);
});

test("mcq answers keep index 0", async () => {
  await upsertChallenge(
    { ...coding, id: "ch-mcq", type: "mcq", options: ["a", "b"], public_test_cases: undefined },
    { correct_answer_index: 0 }
  );
  assert.equal((await getChallengePrivate("ch-mcq"))?.correct_answer_index, 0);
  assert.deepEqual((await getChallenge("ch-mcq"))?.options, ["a", "b"]);
});

test("upsertChallenge for a missing module fails with a readable message", async () => {
  await assert.rejects(
    upsertChallenge({ ...coding, module_id: "module-99" }, {}),
    (err) => err instanceof UserError && /Модуль олдсонгүй: module-99/.test(err.message)
  );
});

test("listChallengesByModule sorts by order", async () => {
  await addModule("module-02", 2);
  await upsertChallenge({ ...coding, id: "ch-b", order: 2 }, {});
  await upsertChallenge({ ...coding, id: "ch-a", order: 1 }, {});
  await upsertChallenge({ ...coding, id: "ch-other", module_id: "module-02" }, {});
  assert.deepEqual(
    (await listChallengesByModule("module-01")).map((c) => c.id),
    ["ch-a", "ch-b"]
  );
});

test("deleteChallenge removes answers and submissions", async () => {
  await addUser("u1");
  await upsertChallenge(coding, codingPrivate);
  await getDb().insert(submissions).values({ uid: "u1", challenge_id: "ch-sum" });
  await deleteChallenge("ch-sum");
  assert.equal(await getChallenge("ch-sum"), null);
  assert.equal((await getDb().select().from(challengeAnswers)).length, 0);
  assert.equal((await getDb().select().from(submissions)).length, 0);
});

const logic: Challenge = {
  id: "ch-and",
  module_id: "module-01",
  type: "logic",
  title: "AND",
  prompt: "Q = A AND B",
  xp_reward: 10,
  order: 2,
  logic_spec: {
    inputs: ["A", "B"],
    outputs: ["Q"],
    allowed_gates: ["AND"],
    max_gates: 1,
    table_visible: false,
  },
};

test("logic challenges keep the expected table private", async () => {
  await upsertChallenge(logic, { expected_table: ["0", "0", "0", "1"] });
  const got = await getChallenge("ch-and");
  assert.equal(got?.type, "logic");
  assert.deepEqual(got?.logic_spec, logic.logic_spec);
  assert.equal("expected_table" in (got as object), false);
  assert.deepEqual((await getChallengePrivate("ch-and"))?.expected_table, ["0", "0", "0", "1"]);
});
