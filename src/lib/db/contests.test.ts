import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import {
  contestParticipants,
  contestProblemAnswers,
  contestProblems,
  contestSubmissions,
  contests,
} from "@/lib/db/schema";
import {
  applySubmissionScore,
  contestStatus,
  deleteContest,
  deleteProblem,
  getContest,
  copyProblem,
  countPending,
  decideRequests,
  getParticipant,
  getProblem,
  getProblemPrivate,
  listContests,
  listParticipants,
  listProblems,
  listRequests,
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
  requires_approval: false,
  series: null,
  grade_min: null,
  grade_max: null,
  is_public: false,
};
/** Same contest, but «Оролцох» only files a request. */
const gated: Contest = { ...contest, id: "gated-cup", requires_approval: true };
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
  const { registered_at, ...rest } = (await getParticipant(contest.id, "s1"))!;
  assert.equal(typeof registered_at, "number");
  assert.deepEqual(rest, {
    status: "approved",
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

/* ------------------------------ approval ------------------------------ */

const join = (contestId: string, uid: string) =>
  registerParticipant(contestId, { uid, name: uid, email: `${uid}@x` });

async function statusOf(contestId: string, uid: string) {
  return (await getParticipant(contestId, uid))?.status;
}

test("registration needs approval when the contest asks for it", async () => {
  await addUser("s1");
  await upsertContest(gated);
  await upsertContest(contest);
  assert.equal(await join(gated.id, "s1"), "pending");
  assert.equal(await statusOf(gated.id, "s1"), "pending");
  assert.equal(await join(contest.id, "s1"), "approved");
});

test("registering again never changes the status", async () => {
  await addUser("s1");
  await addUser("t1", { role: "teacher" });
  await upsertContest(gated);
  await join(gated.id, "s1");
  assert.equal(await decideRequests(gated.id, ["s1"], "rejected", "t1"), 1);
  assert.equal(await join(gated.id, "s1"), "rejected");
  assert.equal(await statusOf(gated.id, "s1"), "rejected");
});

test("only approved participants are listed and ranked", async () => {
  await addUser("a");
  await addUser("b", { class_name: "10А" });
  await addUser("t1", { role: "teacher" });
  await upsertContest(gated);
  await join(gated.id, "a");
  await join(gated.id, "b");
  await decideRequests(gated.id, ["a"], "approved", "t1");
  assert.deepEqual((await listParticipants(gated.id)).map((p) => p.uid), ["a"]);
  const requests = await listRequests(gated.id);
  assert.deepEqual(
    requests.map(({ uid, status, class_name }) => ({ uid, status, class_name })),
    [{ uid: "b", status: "pending", class_name: "10А" }]
  );
  assert.equal(typeof requests[0].requested_at, "number");
});

test("approve moves pending and rejected rows; reject only pending", async () => {
  for (const uid of ["p", "r", "ok", "late"]) await addUser(uid);
  await addUser("t1", { role: "teacher" });
  await addUser("t2", { role: "teacher" });
  await upsertContest(gated);
  for (const uid of ["p", "r", "ok"]) await join(gated.id, uid);
  await decideRequests(gated.id, ["r"], "rejected", "t2");
  await decideRequests(gated.id, ["ok"], "approved", "t2");

  assert.equal(await decideRequests(gated.id, ["p", "r"], "approved", "t1"), 2);
  assert.equal(await statusOf(gated.id, "p"), "approved");
  assert.equal(await statusOf(gated.id, "r"), "approved");

  // A second teacher's «Татгалзах» never demotes someone already approved.
  await join(gated.id, "late");
  assert.equal(await decideRequests(gated.id, ["ok", "late"], "rejected", "t2"), 1);
  assert.equal(await statusOf(gated.id, "ok"), "approved");
  assert.equal(await statusOf(gated.id, "late"), "rejected");

  const rows = await getDb().select().from(contestParticipants);
  const p = rows.find((r) => r.uid === "p")!;
  assert.equal(p.decided_by, "t1");
  assert.ok(p.decided_at instanceof Date);
});

test("decide ignores uids outside the contest", async () => {
  await addUser("s2");
  await addUser("t1", { role: "teacher" });
  const other: Contest = { ...gated, id: "other-cup" };
  await upsertContest(gated);
  await upsertContest(other);
  await join(other.id, "s2");
  assert.equal(await decideRequests(gated.id, ["ghost", "s2"], "approved", "t1"), 0);
  assert.equal(await statusOf(other.id, "s2"), "pending");
  assert.equal(await decideRequests(gated.id, [], "approved", "t1"), 0);
});

test("countPending counts per contest", async () => {
  for (const uid of ["a", "b"]) await addUser(uid);
  const quiet: Contest = { ...gated, id: "quiet-cup" };
  await upsertContest(gated);
  await upsertContest(quiet);
  await join(gated.id, "a");
  await join(gated.id, "b");
  assert.deepEqual([...(await countPending([gated.id, quiet.id]))], [[gated.id, 2]]);
  assert.deepEqual([...(await countPending([]))], []);
});

test("a pending participant cannot score", async () => {
  await addUser("s1");
  await upsertContest(gated);
  await join(gated.id, "s1");
  await assert.rejects(
    applySubmissionScore({
      contestId: gated.id,
      uid: "s1",
      problemId: "p1",
      score: 10,
      code: "print(1)",
      passedTests: 1,
      totalTests: 1,
    }),
    (err) => err instanceof NotFoundError && err.message === "Багш таны хүсэлтийг зөвшөөрөөгүй байна."
  );
  assert.equal((await getDb().select().from(contestSubmissions)).length, 0);
});

test("requires_approval round-trips", async () => {
  await upsertContest(gated);
  assert.equal((await getContest(gated.id))?.requires_approval, true);
  await upsertContest({ ...gated, requires_approval: false });
  assert.equal((await getContest(gated.id))?.requires_approval, false);
});

/* ------------------------------ divisions ----------------------------- */

const juniors: Contest = { ...contest, id: "juniors-cup", series: "Намар", grade_min: 6, grade_max: 7 };

test("division fields round-trip", async () => {
  await upsertContest(juniors);
  const got = await getContest(juniors.id);
  assert.equal(got?.series, "Намар");
  assert.equal(got?.grade_min, 6);
  assert.equal(got?.grade_max, 7);
});

test("the database refuses a reversed grade range", async () => {
  await assert.rejects(upsertContest({ ...juniors, grade_min: 8, grade_max: 6 }));
  await assert.rejects(upsertContest({ ...juniors, grade_min: 6, grade_max: null }));
});

test("an out-of-range student cannot register", async () => {
  await addUser("big", { class_name: "11B" });
  await upsertContest(juniors);
  await assert.rejects(
    registerParticipant(juniors.id, { uid: "big", name: "big", email: "big@x" }),
    (err) => err instanceof UserError && err.message === "Таны анги (11) энэ ангилалд хамаарахгүй."
  );
  assert.equal((await getDb().select().from(contestParticipants)).length, 0);
});

test("an in-range student follows the approval setting", async () => {
  await addUser("small", { class_name: "7A" });
  await upsertContest(juniors);
  assert.equal(await registerParticipant(juniors.id, { uid: "small", name: "s", email: "s@x" }), "approved");
});

test("an unknown class always waits for a teacher", async () => {
  await addUser("noclass");
  await addUser("odd", { class_name: "A7" });
  await upsertContest(juniors);
  assert.equal(await registerParticipant(juniors.id, { uid: "noclass", name: "n", email: "n@x" }), "pending");
  assert.equal(await registerParticipant(juniors.id, { uid: "odd", name: "o", email: "o@x" }), "pending");
});

test("the division check does not apply to staff", async () => {
  await addUser("t-noclass", { role: "teacher" });
  await addUser("a-senior", { role: "admin", class_name: "11B" });
  await upsertContest(juniors);
  assert.equal(await registerParticipant(juniors.id, { uid: "t-noclass", name: "t", email: "t@x" }), "approved");
  assert.equal(await registerParticipant(juniors.id, { uid: "a-senior", name: "a", email: "a@x" }), "approved");
});

test("the open division takes any grade", async () => {
  await addUser("big", { class_name: "11B" });
  const open: Contest = { ...juniors, id: "open-cup", grade_min: null, grade_max: null };
  await upsertContest(open);
  assert.equal(await registerParticipant(open.id, { uid: "big", name: "b", email: "b@x" }), "approved");
});

test("is_public defaults to false and round-trips", async () => {
  await getDb().insert(contests).values({ id: "raw-cup", title: "t", starts_at: new Date(0), ends_at: new Date(1) });
  assert.equal((await getContest("raw-cup"))?.is_public, false);
  await upsertContest({ ...contest, is_public: true });
  assert.equal((await getContest(contest.id))?.is_public, true);
});

test("copyProblem copies public and private parts", async () => {
  const other: Contest = { ...juniors, id: "seniors-cup", grade_min: 11, grade_max: 12 };
  await upsertContest(juniors);
  await upsertContest(other);
  const hidden = [{ input: "5 5", expected_output: "10" }];
  await upsertProblem(juniors.id, problem, { hidden_test_cases: hidden });
  await copyProblem(juniors.id, problem.id, other.id);
  assert.deepEqual(await getProblem(other.id, problem.id), await getProblem(juniors.id, problem.id));
  assert.deepEqual(await getProblemPrivate(other.id, problem.id), {
    hidden_test_cases: hidden,
    expected_table: undefined,
  });
});

test("copyProblem refuses an id that exists in the target", async () => {
  const other: Contest = { ...juniors, id: "seniors-cup", grade_min: 11, grade_max: 12 };
  await upsertContest(juniors);
  await upsertContest(other);
  await upsertProblem(juniors.id, problem, { hidden_test_cases: [{ input: "1 1", expected_output: "2" }] });
  await upsertProblem(other.id, { ...problem, title: "Өөр" }, { hidden_test_cases: [] });
  await assert.rejects(
    copyProblem(juniors.id, problem.id, other.id),
    (err) => err instanceof UserError && err.message === "Тэр тэмцээнд «p1» ID-тэй бодлого аль хэдийн байна."
  );
  assert.equal((await getProblem(other.id, problem.id))?.title, "Өөр");
  assert.deepEqual((await getProblemPrivate(other.id, problem.id))?.hidden_test_cases, []);
  assert.equal((await getProblem(juniors.id, problem.id))?.title, problem.title);
  await assert.rejects(copyProblem(juniors.id, "nope", other.id), (err) => err instanceof NotFoundError);
});
