import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb } from "@/lib/db/client";
import { getUserProfile } from "@/lib/db/users";
import {
  getSubmission,
  listPassedChallengeIds,
  markHintUsed,
  recordSubmission,
} from "@/lib/db/submissions";
import { NotFoundError } from "@/lib/errors";

beforeEach(async () => {
  await resetDb();
  await addModule("module-01", 1);
  await addChallenge("ch-1", "module-01");
  await addChallenge("ch-2", "module-01", { order: 2 });
  await addUser("u1");
});
after(closeDb);

const attempt = (passed: boolean, code = "print(1)") =>
  recordSubmission({ uid: "u1", challengeId: "ch-1", code, passed, xpReward: 10 });

const xp = async () => (await getUserProfile("u1"))!.total_xp;

test("XP is paid only on the first successful pass", async () => {
  assert.deepEqual(await attempt(false), { xpAwarded: 0 });
  assert.deepEqual(await attempt(true), { xpAwarded: 10 });
  assert.deepEqual(await attempt(true), { xpAwarded: 0 });
  assert.equal(await xp(), 10);
});

test("a later failed run never un-passes, but records the attempt and code", async () => {
  await attempt(true, "good");
  await attempt(false, "bad");
  assert.deepEqual(await getSubmission("u1", "ch-1"), {
    challenge_id: "ch-1",
    passed: true,
    attempts: 2,
    code_snapshot: "bad",
    hint_used: false,
  });
});

test("using a hint first costs 30% of the reward", async () => {
  await markHintUsed("u1", "ch-1");
  assert.deepEqual(await attempt(true), { xpAwarded: 7 });
  assert.equal(await xp(), 7);
});

test("a hint alone records no code snapshot, so the editor keeps the starter code", async () => {
  await markHintUsed("u1", "ch-1");
  assert.deepEqual(await getSubmission("u1", "ch-1"), {
    challenge_id: "ch-1",
    passed: false,
    attempts: 0,
    code_snapshot: undefined,
    hint_used: true,
  });
});

test("markHintUsed on a passed submission keeps it passed", async () => {
  await attempt(true);
  await markHintUsed("u1", "ch-1");
  const s = await getSubmission("u1", "ch-1");
  assert.equal(s?.passed, true);
  assert.equal(s?.hint_used, true);
});

test("concurrent passing submissions pay XP exactly once", async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => attempt(true)));
  assert.equal(results.filter((r) => r.xpAwarded > 0).length, 1);
  assert.equal(await xp(), 10);
  assert.equal((await getSubmission("u1", "ch-1"))?.attempts, 5);
});

test("grading or hinting a challenge deleted meanwhile reports it as not found", async () => {
  const gone = (err: unknown) =>
    err instanceof NotFoundError && err.message === "Даалгавар олдсонгүй.";
  await assert.rejects(
    recordSubmission({ uid: "u1", challengeId: "gone", code: "x", passed: true, xpReward: 10 }),
    gone
  );
  await assert.rejects(markHintUsed("u1", "gone"), gone);
});

test("a submission from a deleted account asks the student to sign in again", async () => {
  await assert.rejects(
    recordSubmission({ uid: "ghost", challengeId: "ch-1", code: "x", passed: true, xpReward: 10 }),
    (err) => err instanceof NotFoundError && /дахин нэвтэрнэ үү/.test(err.message)
  );
});

test("listPassedChallengeIds lists only passed challenges", async () => {
  await attempt(true);
  await recordSubmission({ uid: "u1", challengeId: "ch-2", code: "", passed: false, xpReward: 10 });
  assert.deepEqual([...(await listPassedChallengeIds("u1"))], ["ch-1"]);
  assert.equal(await getSubmission("u1", "missing"), null);
});
