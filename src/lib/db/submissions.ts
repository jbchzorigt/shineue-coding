import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb, isForeignKeyViolation } from "@/lib/db/client";
import { submissions, users } from "@/lib/db/schema";
import { ACCOUNT_MISSING, NotFoundError } from "@/lib/errors";
import { HINT_XP_FACTOR, type Submission } from "@/lib/types";

/** A write raced with a delete: the challenge (or the account) is gone. */
function rethrowMissingRow(err: unknown): never {
  if (isForeignKeyViolation(err, "submissions_uid_users_uid_fk")) {
    throw new NotFoundError(ACCOUNT_MISSING);
  }
  if (isForeignKeyViolation(err)) throw new NotFoundError("Даалгавар олдсонгүй.");
  throw err;
}

function toSubmission(r: typeof submissions.$inferSelect): Submission {
  return {
    challenge_id: r.challenge_id,
    passed: r.passed,
    attempts: r.attempts,
    code_snapshot: r.code_snapshot ?? undefined,
    hint_used: r.hint_used,
  };
}

function byKey(uid: string, challengeId: string) {
  return and(eq(submissions.uid, uid), eq(submissions.challenge_id, challengeId));
}

export async function getSubmission(
  uid: string,
  challengeId: string
): Promise<Submission | null> {
  const [row] = await getDb().select().from(submissions).where(byKey(uid, challengeId)).limit(1);
  return row ? toSubmission(row) : null;
}

export async function listPassedChallengeIds(uid: string): Promise<Set<string>> {
  const rows = await getDb()
    .select({ id: submissions.challenge_id })
    .from(submissions)
    .where(and(eq(submissions.uid, uid), eq(submissions.passed, true)));
  return new Set(rows.map((r) => r.id));
}

/**
 * Marks the hint as used BEFORE the hint text is returned to the client —
 * the penalty is recorded server-side, so the client cannot lie about it
 * at grading time.
 */
export async function markHintUsed(uid: string, challengeId: string): Promise<void> {
  try {
    await getDb()
      .insert(submissions)
      .values({ uid, challenge_id: challengeId, hint_used: true })
      .onConflictDoUpdate({
        target: [submissions.uid, submissions.challenge_id],
        set: { hint_used: true },
      });
  } catch (err) {
    rethrowMissingRow(err);
  }
}

/**
 * Records an attempt and awards XP atomically. XP is granted only on the
 * first successful pass — re-running a passed challenge never double-pays,
 * and a later failed run never un-passes it. A hint recorded on the
 * submission costs 30% of the reward.
 */
export async function recordSubmission(params: {
  uid: string;
  challengeId: string;
  code: string;
  passed: boolean;
  xpReward: number;
}): Promise<{ xpAwarded: number }> {
  const key = byKey(params.uid, params.challengeId);

  return getDb().transaction(async (tx) => {
    // Make sure the row exists, then lock it: concurrent submissions of the
    // same challenge queue up here and see each other's result.
    await tx
      .insert(submissions)
      .values({ uid: params.uid, challenge_id: params.challengeId })
      .onConflictDoNothing();
    const [prev] = await tx.select().from(submissions).where(key).for("update");

    const firstPass = params.passed && !prev.passed;
    const xpAwarded = firstPass
      ? prev.hint_used
        ? Math.round(params.xpReward * HINT_XP_FACTOR)
        : params.xpReward
      : 0;

    await tx
      .update(submissions)
      .set({
        passed: prev.passed || params.passed,
        attempts: prev.attempts + 1,
        code_snapshot: params.code,
        updated_at: sql`now()`,
      })
      .where(key);
    if (xpAwarded > 0) {
      await tx
        .update(users)
        .set({ total_xp: sql`${users.total_xp} + ${xpAwarded}` })
        .where(eq(users.uid, params.uid));
    }
    return { xpAwarded };
  }).catch(rethrowMissingRow);
}
