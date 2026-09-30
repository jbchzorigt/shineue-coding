import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contestParticipants, contestSubmissions, users } from "@/lib/db/schema";

/** One attempt with the participant's name and email. */
export interface SubmissionRow {
  id: number;
  uid: string;
  name: string | null;
  email: string;
  class_name: string | null;
  problem_id: string;
  /** Python code, or the circuit as JSON. */
  code: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  /** epoch ms */
  submitted_at: number;
}

const columns = {
  id: contestSubmissions.id,
  uid: contestSubmissions.uid,
  name: contestParticipants.name,
  email: contestParticipants.email,
  class_name: users.class_name,
  problem_id: contestSubmissions.problem_id,
  code: contestSubmissions.code,
  score: contestSubmissions.score,
  passed_tests: contestSubmissions.passed_tests,
  total_tests: contestSubmissions.total_tests,
  submitted_at: contestSubmissions.submitted_at,
};

const participantOf = and(
  eq(contestParticipants.contest_id, contestSubmissions.contest_id),
  eq(contestParticipants.uid, contestSubmissions.uid)
);

function toRow(r: Omit<SubmissionRow, "submitted_at"> & { submitted_at: Date }): SubmissionRow {
  return { ...r, submitted_at: r.submitted_at.getTime() };
}

/** Newest first; `total` counts every attempt matching the filters. */
export async function listContestSubmissions(
  contestId: string,
  opts: { uid?: string; problemId?: string; limit: number; offset: number }
): Promise<{ rows: SubmissionRow[]; total: number }> {
  const where = and(
    eq(contestSubmissions.contest_id, contestId),
    opts.uid ? eq(contestSubmissions.uid, opts.uid) : undefined,
    opts.problemId ? eq(contestSubmissions.problem_id, opts.problemId) : undefined
  );
  const [rows, [{ total }]] = await Promise.all([
    getDb()
      .select(columns)
      .from(contestSubmissions)
      .innerJoin(contestParticipants, participantOf)
      .leftJoin(users, eq(users.uid, contestSubmissions.uid))
      .where(where)
      .orderBy(desc(contestSubmissions.submitted_at), desc(contestSubmissions.id))
      .limit(opts.limit)
      .offset(opts.offset),
    getDb().select({ total: count() }).from(contestSubmissions).where(where),
  ]);
  return { rows: rows.map(toRow), total };
}

/** Each student's best attempt per problem: highest score, then the latest. */
export async function bestSubmissions(contestId: string): Promise<SubmissionRow[]> {
  const rows = await getDb()
    .selectDistinctOn([contestSubmissions.uid, contestSubmissions.problem_id], columns)
    .from(contestSubmissions)
    .innerJoin(contestParticipants, participantOf)
    .leftJoin(users, eq(users.uid, contestSubmissions.uid))
    .where(eq(contestSubmissions.contest_id, contestId))
    .orderBy(
      contestSubmissions.uid,
      contestSubmissions.problem_id,
      desc(contestSubmissions.score),
      desc(contestSubmissions.submitted_at),
      desc(contestSubmissions.id)
    );
  return rows.map(toRow);
}

/** Every attempt, oldest first — for the CSV export. */
export async function allContestSubmissions(contestId: string): Promise<SubmissionRow[]> {
  const rows = await getDb()
    .select(columns)
    .from(contestSubmissions)
    .innerJoin(contestParticipants, participantOf)
    .leftJoin(users, eq(users.uid, contestSubmissions.uid))
    .where(eq(contestSubmissions.contest_id, contestId))
    .orderBy(asc(contestSubmissions.submitted_at), asc(contestSubmissions.id));
  return rows.map(toRow);
}
