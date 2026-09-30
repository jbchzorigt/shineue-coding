import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { contestSubmissions } from "@/lib/db/schema";
import { registerParticipant, upsertContest } from "@/lib/db/contests";
import {
  allContestSubmissions,
  bestSubmissions,
  listContestSubmissions,
} from "@/lib/db/contest-submissions";

beforeEach(resetDb);
after(closeDb);

const CUP = "cup";

async function seed(): Promise<void> {
  for (const id of [CUP, "other"]) {
    await upsertContest({
      id,
      title: id,
      description: "",
      starts_at: Date.parse("2026-03-01T09:00:00Z"),
      ends_at: Date.parse("2026-03-01T12:00:00Z"),
    });
  }
  await addUser("s1", { class_name: "11A" });
  await addUser("s2");
  await registerParticipant(CUP, { uid: "s1", name: "Бат", email: "s1@x" });
  await registerParticipant(CUP, { uid: "s2", name: null, email: "s2@x" });
  await registerParticipant("other", { uid: "s1", name: "Бат", email: "s1@x" });
}

/** One attempt at 09:<minute> UTC; its code names who, what and when. */
async function attempt(uid: string, problemId: string, score: number, minute: number, contestId = CUP) {
  await getDb()
    .insert(contestSubmissions)
    .values({
      contest_id: contestId,
      uid,
      problem_id: problemId,
      code: `${uid}-${problemId}-${minute}`,
      score,
      passed_tests: 1,
      total_tests: 2,
      submitted_at: new Date(Date.UTC(2026, 2, 1, 9, minute)),
    });
}

test("listContestSubmissions: newest first, with names, only this contest", async () => {
  await seed();
  await attempt("s1", "p1", 10, 1);
  await attempt("s2", "p1", 20, 2);
  await attempt("s1", "p2", 30, 3);
  await attempt("s1", "p1", 40, 4, "other");

  const { rows, total } = await listContestSubmissions(CUP, { limit: 10, offset: 0 });
  assert.equal(total, 3);
  assert.deepEqual(rows.map((r) => r.code), ["s1-p2-3", "s2-p1-2", "s1-p1-1"]);
  assert.equal(rows[0].name, "Бат");
  assert.equal(rows[0].class_name, "11A");
  assert.equal(rows[1].class_name, null);
  assert.equal(rows[1].name, null);
  assert.equal(rows[1].email, "s2@x");
  assert.equal(rows[0].submitted_at, Date.UTC(2026, 2, 1, 9, 3));
  assert.equal(rows[0].score, 30);
});

test("listContestSubmissions: filters by student and problem, and pages", async () => {
  await seed();
  await attempt("s1", "p1", 10, 1);
  await attempt("s2", "p1", 20, 2);
  await attempt("s1", "p2", 30, 3);

  const s1 = await listContestSubmissions(CUP, { uid: "s1", limit: 10, offset: 0 });
  assert.deepEqual([s1.total, s1.rows.map((r) => r.code)], [2, ["s1-p2-3", "s1-p1-1"]]);
  const p1 = await listContestSubmissions(CUP, { problemId: "p1", limit: 1, offset: 1 });
  assert.deepEqual([p1.total, p1.rows.map((r) => r.code)], [2, ["s1-p1-1"]]);
});

test("bestSubmissions: highest score per student and problem, latest on a tie", async () => {
  await seed();
  await attempt("s1", "p1", 50, 1);
  await attempt("s1", "p1", 80, 2);
  await attempt("s1", "p1", 80, 3);
  await attempt("s1", "p1", 20, 4);
  await attempt("s2", "p1", 0, 5);
  await attempt("s1", "p2", 10, 6);
  await attempt("s1", "p1", 99, 7, "other");

  const best = await bestSubmissions(CUP);
  assert.deepEqual(best.map((r) => r.code).sort(), ["s1-p1-3", "s1-p2-6", "s2-p1-5"]);
});

test("allContestSubmissions: every attempt of this contest, oldest first", async () => {
  await seed();
  await attempt("s2", "p1", 20, 2);
  await attempt("s1", "p1", 10, 1);
  await attempt("s1", "p1", 40, 3, "other");

  assert.deepEqual((await allContestSubmissions(CUP)).map((r) => r.code), ["s1-p1-1", "s2-p1-2"]);
});
