import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import {
  contestParticipants,
  contestProblemAnswers,
  contestProblems,
  contestSubmissions,
} from "@/lib/db/schema";
import {
  applySubmissionScore,
  contestStatus,
  deleteContest,
  deleteProblem,
  getContest,
  getParticipant,
  getProblem,
  getProblemPrivate,
  listContests,
  listParticipants,
  listProblems,
  registerParticipant,
  upsertContest,
  upsertProblem,
  type Contest,
  type ContestProblem,
} from "@/lib/db/contests";
import { NotFoundError, UserError } from "@/lib/errors";

beforeEach(resetDb);
after(closeDb);

const contest: Contest = {
  id: "spring-cup",
  title: "Хаврын тэмцээн",
  description: "d",
  starts_at: Date.parse("2026-03-01T09:00:00Z"),
  ends_at: Date.parse("2026-03-01T12:00:00Z"),
};
const problem: ContestProblem = {
  id: "p1",
  title: "Нийлбэр",
  prompt: "a + b",
  order: 1,
  points: 100,
  kind: "python",
  starter_code: "",
  public_test_cases: [{ input: "1 2", expected_output: "3" }],
};

async function setupContestWithStudent(): Promise<void> {
  await addUser("s1");
  await upsertContest(contest);
  await upsertProblem(contest.id, problem, { hidden_test_cases: [] });
  await upsertProblem(contest.id, { ...problem, id: "p2", order: 2 }, { hidden_test_cases: [] });
  await registerParticipant(contest.id, { uid: "s1", name: "Бат", email: "s1@shineue.edu.mn" });
}

const score = (problemId: string, value: number) =>
  applySubmissionScore({
    contestId: contest.id,
    uid: "s1",
    problemId,
    score: value,
    code: "print(3)",
    passedTests: 1,
    totalTests: 2,
  });

test("contestStatus follows the clock", () => {
  assert.equal(contestStatus(contest, contest.starts_at - 1), "upcoming");
  assert.equal(contestStatus(contest, contest.starts_at), "running");
  assert.equal(contestStatus(contest, contest.ends_at), "running");
  assert.equal(contestStatus(contest, contest.ends_at + 1), "finished");
});

test("contests round-trip and list newest first", async () => {
  const later = { ...contest, id: "autumn-cup", starts_at: contest.starts_at + 86_400_000 };
  await upsertContest(contest);
  await upsertContest(later);
  assert.deepEqual(await getContest(contest.id), contest);
  assert.deepEqual((await listContests()).map((c) => c.id), ["autumn-cup", "spring-cup"]);
  assert.equal(await getContest("Bad Id"), null);
  await upsertContest({ ...contest, title: "Шинэ" });
  assert.equal((await getContest(contest.id))?.title, "Шинэ");
});

test("problems keep hidden tests apart and are replaced on upsert", async () => {
  await upsertContest(contest);
  await upsertProblem(contest.id, { ...problem, id: "p2", order: 2 }, { hidden_test_cases: [] });
  await upsertProblem(contest.id, problem, {
    hidden_test_cases: [{ input: "5 5", expected_output: "10" }],
  });
  assert.deepEqual((await listProblems(contest.id)).map((p) => p.id), ["p1", "p2"]);
  assert.deepEqual(await getProblem(contest.id, "p1"), { ...problem, logic_spec: undefined });
  assert.deepEqual(await getProblemPrivate(contest.id, "p1"), {
    hidden_test_cases: [{ input: "5 5", expected_output: "10" }],
    expected_table: undefined,
  });
  await upsertProblem(contest.id, { ...problem, points: 50 }, { hidden_test_cases: [] });
  assert.equal((await getProblem(contest.id, "p1"))?.points, 50);
  assert.deepEqual(await getProblemPrivate(contest.id, "p1"), {
    hidden_test_cases: [],
    expected_table: undefined,
  });

  await deleteProblem(contest.id, "p1");
  assert.equal(await getProblem(contest.id, "p1"), null);
  assert.equal(await getProblemPrivate(contest.id, "p1"), null);
});

test("registerParticipant is idempotent", async () => {
  await setupContestWithStudent();
  await registerParticipant(contest.id, { uid: "s1", name: "Бат", email: "s1@shineue.edu.mn" });
  assert.deepEqual(await getParticipant(contest.id, "s1"), {
    uid: "s1",
    name: "Бат",
    email: "s1@shineue.edu.mn",
    class_name: null,
    scores: {},
    total: 0,
    last_improved_at: null,
  });
  assert.equal((await getDb().select().from(contestParticipants)).length, 1);
});

test("the best score per problem is kept and every attempt is logged", async () => {
  await setupContestWithStudent();
  assert.deepEqual(await score("p1", 50), { improved: true, bestScore: 50 });
  assert.deepEqual(await score("p1", 25), { improved: false, bestScore: 50 });
  assert.deepEqual(await score("p1", 100), { improved: true, bestScore: 100 });

  const p = await getParticipant(contest.id, "s1");
  assert.deepEqual(p?.scores, { p1: 100 });
  assert.equal(p?.total, 100);
  assert.ok(p?.last_improved_at);
  assert.equal((await getDb().select().from(contestSubmissions)).length, 3);
});

test("concurrent improvements on different problems add up", async () => {
  await setupContestWithStudent();
  await Promise.all([score("p1", 40), score("p2", 60)]);
  const p = await getParticipant(contest.id, "s1");
  assert.deepEqual(p?.scores, { p1: 40, p2: 60 });
  assert.equal(p?.total, 100);
});

test("an unregistered student is rejected and nothing is logged", async () => {
  await addUser("s1");
  await upsertContest(contest);
  await assert.rejects(
    score("p1", 50),
    (err) => err instanceof NotFoundError && /Оролцогч бүртгэлгүй байна/.test(err.message)
  );
  assert.equal((await getDb().select().from(contestSubmissions)).length, 0);
});

test("saving a problem for a deleted contest fails with a readable message", async () => {
  await assert.rejects(
    upsertProblem("gone-cup", problem, { hidden_test_cases: [] }),
    (err) => err instanceof UserError && /Тэмцээн олдсонгүй: gone-cup/.test(err.message)
  );
});

test("registering for a deleted contest, or from a deleted account, is reported as not found", async () => {
  await addUser("s1");
  await assert.rejects(
    registerParticipant("gone-cup", { uid: "s1", name: "Бат", email: "s1@shineue.edu.mn" }),
    (err) => err instanceof NotFoundError && err.message === "Тэмцээн олдсонгүй."
  );
  await upsertContest(contest);
  await assert.rejects(
    registerParticipant(contest.id, { uid: "ghost", name: null, email: "ghost@shineue.edu.mn" }),
    (err) => err instanceof NotFoundError && /дахин нэвтэрнэ үү/.test(err.message)
  );
});

test("participants rank by total, then earliest improvement; never-improved last", async () => {
  await upsertContest(contest);
  for (const uid of ["a", "b", "c", "d"]) await addUser(uid);
  await getDb().insert(contestParticipants).values([
    { contest_id: contest.id, uid: "a", email: "a", total: 100, last_improved_at: new Date("2026-03-01T10:30:00Z") },
    { contest_id: contest.id, uid: "b", email: "b", total: 100, last_improved_at: new Date("2026-03-01T10:00:00Z") },
    { contest_id: contest.id, uid: "c", email: "c", total: 50, last_improved_at: new Date("2026-03-01T09:30:00Z") },
    { contest_id: contest.id, uid: "d", email: "d", total: 0, last_improved_at: null },
  ]);
  assert.deepEqual((await listParticipants(contest.id)).map((p) => p.uid), ["b", "a", "c", "d"]);
});

test("participants carry their current class from the user account", async () => {
  await upsertContest(contest);
  await addUser("a", { class_name: "11A" });
  await addUser("b");
  await registerParticipant(contest.id, { uid: "a", name: "А", email: "a@x" });
  await registerParticipant(contest.id, { uid: "b", name: "Б", email: "b@x" });
  const byUid = Object.fromEntries((await listParticipants(contest.id)).map((p) => [p.uid, p.class_name]));
  assert.deepEqual(byUid, { a: "11A", b: null });
});

test("deleteContest removes problems, answers, participants and attempts", async () => {
  await setupContestWithStudent();
  await score("p1", 50);
  await deleteContest(contest.id);
  const db = getDb();
  assert.equal(await getContest(contest.id), null);
  assert.equal((await db.select().from(contestProblems)).length, 0);
  assert.equal((await db.select().from(contestProblemAnswers)).length, 0);
  assert.equal((await db.select().from(contestParticipants)).length, 0);
  assert.equal((await db.select().from(contestSubmissions)).length, 0);
});

test("logic problems round-trip and keep the expected table private", async () => {
  await upsertContest(contest);
  const gates: ContestProblem = {
    id: "gates",
    title: "XOR",
    prompt: "p",
    order: 3,
    points: 100,
    kind: "logic",
    public_test_cases: [],
    logic_spec: {
      inputs: ["A", "B"],
      outputs: ["Q"],
      allowed_gates: ["AND", "OR", "NOT"],
      max_gates: 5,
      table_visible: true,
    },
  };
  await upsertProblem(contest.id, gates, { hidden_test_cases: [], expected_table: ["0", "1", "1", "0"] });
  const got = await getProblem(contest.id, "gates");
  assert.equal(got?.kind, "logic");
  assert.deepEqual(got?.logic_spec, gates.logic_spec);
  assert.equal("expected_table" in (got as object), false);
  assert.deepEqual((await getProblemPrivate(contest.id, "gates"))?.expected_table, ["0", "1", "1", "0"]);
});

test("the database rejects an unknown problem kind", async () => {
  await upsertContest(contest);
  await assert.rejects(
    upsertProblem(contest.id, { ...problem, kind: "java" as never }, { hidden_test_cases: [] })
  );
});
