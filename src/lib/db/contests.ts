import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, isForeignKeyViolation } from "@/lib/db/client";
import {
  contestParticipants,
  contestProblemAnswers,
  contestProblems,
  contests,
  contestSubmissions,
} from "@/lib/db/schema";
import { ACCOUNT_MISSING, NotFoundError, UserError } from "@/lib/errors";
import type { LogicSpec, TruthTable } from "@/lib/logic/spec";
import type { PublicTestCase } from "@/lib/types";

export interface Contest {
  id: string;
  title: string;
  description: string;
  /** epoch ms */
  starts_at: number;
  ends_at: number;
}

export type ContestStatus = "upcoming" | "running" | "finished";

export function contestStatus(c: Contest, now = Date.now()): ContestStatus {
  if (now < c.starts_at) return "upcoming";
  if (now <= c.ends_at) return "running";
  return "finished";
}

/** "logic" problems are answered with a circuit instead of code. */
export type ContestProblemKind = "python" | "logic";

export interface ContestProblem {
  id: string;
  title: string;
  prompt: string;
  order: number;
  /** Max score; partial credit per passed test. */
  points: number;
  kind: ContestProblemKind;
  starter_code?: string;
  public_test_cases: PublicTestCase[];
  logic_spec?: LogicSpec;
}

export interface ContestProblemPrivate {
  hidden_test_cases: PublicTestCase[];
  expected_table?: TruthTable;
}

export interface Participant {
  uid: string;
  name: string | null;
  email: string;
  /** problem id → best score */
  scores: Record<string, number>;
  total: number;
  /** epoch ms of the submission that last improved the total (tiebreak). */
  last_improved_at: number | null;
}

/* ------------------------------- contests ------------------------------ */

function toContest(r: typeof contests.$inferSelect): Contest {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    starts_at: r.starts_at.getTime(),
    ends_at: r.ends_at.getTime(),
  };
}

export async function listContests(): Promise<Contest[]> {
  const rows = await getDb().select().from(contests).orderBy(desc(contests.starts_at));
  return rows.map(toContest);
}

export async function getContest(id: string): Promise<Contest | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const [row] = await getDb().select().from(contests).where(eq(contests.id, id)).limit(1);
  return row ? toContest(row) : null;
}

export async function upsertContest(contest: Contest): Promise<void> {
  const data = {
    title: contest.title,
    description: contest.description,
    starts_at: new Date(contest.starts_at),
    ends_at: new Date(contest.ends_at),
  };
  await getDb()
    .insert(contests)
    .values({ id: contest.id, ...data })
    .onConflictDoUpdate({ target: contests.id, set: data });
}

/** Also deletes problems, participants and their attempts (FK cascade). */
export async function deleteContest(id: string): Promise<void> {
  await getDb().delete(contests).where(eq(contests.id, id));
}

/* ------------------------------- problems ------------------------------ */

function toProblem(r: typeof contestProblems.$inferSelect): ContestProblem {
  return {
    id: r.id,
    title: r.title,
    prompt: r.prompt,
    order: r.order,
    points: r.points,
    kind: r.kind,
    starter_code: r.starter_code ?? undefined,
    public_test_cases: r.public_test_cases,
    logic_spec: r.logic_spec ?? undefined,
  };
}

function problemKey(contestId: string, problemId: string) {
  return and(eq(contestProblems.contest_id, contestId), eq(contestProblems.id, problemId));
}

export async function listProblems(contestId: string): Promise<ContestProblem[]> {
  const rows = await getDb()
    .select()
    .from(contestProblems)
    .where(eq(contestProblems.contest_id, contestId))
    .orderBy(asc(contestProblems.order), asc(contestProblems.id));
  return rows.map(toProblem);
}

export async function getProblem(
  contestId: string,
  problemId: string
): Promise<ContestProblem | null> {
  const [row] = await getDb()
    .select()
    .from(contestProblems)
    .where(problemKey(contestId, problemId))
    .limit(1);
  return row ? toProblem(row) : null;
}

export async function getProblemPrivate(
  contestId: string,
  problemId: string
): Promise<ContestProblemPrivate | null> {
  const [row] = await getDb()
    .select({
      hidden_test_cases: contestProblemAnswers.hidden_test_cases,
      expected_table: contestProblemAnswers.expected_table,
    })
    .from(contestProblemAnswers)
    .where(
      and(
        eq(contestProblemAnswers.contest_id, contestId),
        eq(contestProblemAnswers.problem_id, problemId)
      )
    )
    .limit(1);
  return row
    ? { hidden_test_cases: row.hidden_test_cases, expected_table: row.expected_table ?? undefined }
    : null;
}

/** Writes public + private parts together; replaces the whole problem. */
export async function upsertProblem(
  contestId: string,
  problem: ContestProblem,
  privateData: ContestProblemPrivate
): Promise<void> {
  const data = {
    title: problem.title,
    prompt: problem.prompt,
    order: problem.order,
    points: problem.points,
    kind: problem.kind,
    starter_code: problem.starter_code ?? null,
    public_test_cases: problem.public_test_cases,
    logic_spec: problem.logic_spec ?? null,
  };
  try {
    await getDb().transaction(async (tx) => {
      await tx
        .insert(contestProblems)
        .values({ contest_id: contestId, id: problem.id, ...data })
        .onConflictDoUpdate({ target: [contestProblems.contest_id, contestProblems.id], set: data });
      await tx
        .insert(contestProblemAnswers)
        .values({
          contest_id: contestId,
          problem_id: problem.id,
          hidden_test_cases: privateData.hidden_test_cases,
          expected_table: privateData.expected_table ?? null,
        })
        .onConflictDoUpdate({
          target: [contestProblemAnswers.contest_id, contestProblemAnswers.problem_id],
          set: {
            hidden_test_cases: privateData.hidden_test_cases,
            expected_table: privateData.expected_table ?? null,
          },
        });
    });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new UserError(`Тэмцээн олдсонгүй: ${contestId}`);
    throw err;
  }
}

export async function deleteProblem(contestId: string, problemId: string): Promise<void> {
  await getDb().delete(contestProblems).where(problemKey(contestId, problemId));
}

/* ----------------------------- participants ---------------------------- */

function toParticipant(r: typeof contestParticipants.$inferSelect): Participant {
  return {
    uid: r.uid,
    name: r.name,
    email: r.email,
    scores: r.scores,
    total: r.total,
    last_improved_at: r.last_improved_at?.getTime() ?? null,
  };
}

function participantKey(contestId: string, uid: string) {
  return and(eq(contestParticipants.contest_id, contestId), eq(contestParticipants.uid, uid));
}

export async function getParticipant(contestId: string, uid: string): Promise<Participant | null> {
  const [row] = await getDb()
    .select()
    .from(contestParticipants)
    .where(participantKey(contestId, uid))
    .limit(1);
  return row ? toParticipant(row) : null;
}

/** Ranked: total desc, earlier improvement wins ties (never-improved last). */
export async function listParticipants(contestId: string): Promise<Participant[]> {
  const rows = await getDb()
    .select()
    .from(contestParticipants)
    .where(eq(contestParticipants.contest_id, contestId))
    .orderBy(
      desc(contestParticipants.total),
      sql`${contestParticipants.last_improved_at} asc nulls last`,
      asc(contestParticipants.registered_at)
    );
  return rows.map(toParticipant);
}

export async function registerParticipant(
  contestId: string,
  user: { uid: string; name: string | null; email: string }
): Promise<void> {
  try {
    await getDb()
      .insert(contestParticipants)
      .values({ contest_id: contestId, uid: user.uid, name: user.name, email: user.email })
      .onConflictDoNothing();
  } catch (err) {
    if (isForeignKeyViolation(err, "contest_participants_uid_users_uid_fk")) {
      throw new NotFoundError(ACCOUNT_MISSING);
    }
    if (isForeignKeyViolation(err)) throw new NotFoundError("Тэмцээн олдсонгүй.");
    throw err;
  }
}

/**
 * Records an attempt; the participant keeps their BEST score per problem.
 * Returns the score of this attempt and whether it improved the total.
 */
export async function applySubmissionScore(params: {
  contestId: string;
  uid: string;
  problemId: string;
  score: number;
  code: string;
  passedTests: number;
  totalTests: number;
}): Promise<{ improved: boolean; bestScore: number }> {
  const key = participantKey(params.contestId, params.uid);

  return getDb().transaction(async (tx) => {
    // Lock the participant row: concurrent submissions serialize here, so
    // neither can overwrite the other's score.
    const [participant] = await tx.select().from(contestParticipants).where(key).for("update");
    if (!participant) throw new NotFoundError("Оролцогч бүртгэлгүй байна.");

    // Attempt audit trail (append-only). Written after the check — it
    // references the participant row.
    await tx.insert(contestSubmissions).values({
      contest_id: params.contestId,
      uid: params.uid,
      problem_id: params.problemId,
      code: params.code,
      score: params.score,
      passed_tests: params.passedTests,
      total_tests: params.totalTests,
    });

    const prev = participant.scores[params.problemId] ?? 0;
    if (params.score <= prev) {
      return { improved: false, bestScore: prev };
    }
    const scores = { ...participant.scores, [params.problemId]: params.score };
    const total = Object.values(scores).reduce((s, x) => s + x, 0);
    await tx
      .update(contestParticipants)
      .set({ scores, total, last_improved_at: sql`now()` })
      .where(key);
    return { improved: true, bestScore: params.score };
  });
}
