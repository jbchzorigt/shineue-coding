import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { HINT_XP_FACTOR, type Submission } from "@/lib/types";

export async function getSubmission(
  uid: string,
  challengeId: string
): Promise<Submission | null> {
  const snap = await getDb()
    .doc(`users/${uid}/submissions/${challengeId}`)
    .get();
  return snap.exists ? (snap.data() as Submission) : null;
}

export async function listPassedChallengeIds(uid: string): Promise<Set<string>> {
  const snap = await getDb()
    .collection(`users/${uid}/submissions`)
    .where("passed", "==", true)
    .get();
  return new Set(snap.docs.map((d) => d.id));
}

/**
 * Marks the hint as used BEFORE the hint text is returned to the client —
 * the penalty is recorded server-side, so the client cannot lie about it
 * at grading time.
 */
export async function markHintUsed(uid: string, challengeId: string): Promise<void> {
  await getDb()
    .doc(`users/${uid}/submissions/${challengeId}`)
    .set(
      { challenge_id: challengeId, hint_used: true },
      { merge: true }
    );
}

/**
 * Records an attempt and awards XP atomically. XP is granted only on the
 * first successful pass — re-running a passed challenge never double-pays,
 * and a later failed run never un-passes it. A hint recorded on the
 * submission doc costs 30% of the reward.
 */
export async function recordSubmission(params: {
  uid: string;
  challengeId: string;
  code: string;
  passed: boolean;
  xpReward: number;
}): Promise<{ xpAwarded: number }> {
  const db = getDb();
  const subRef = db.doc(`users/${params.uid}/submissions/${params.challengeId}`);
  const userRef = db.doc(`users/${params.uid}`);

  return db.runTransaction(async (tx) => {
    const prev = (await tx.get(subRef)).data() as Submission | undefined;
    const firstPass = params.passed && !prev?.passed;
    const xpAwarded = firstPass
      ? prev?.hint_used
        ? Math.round(params.xpReward * HINT_XP_FACTOR)
        : params.xpReward
      : 0;

    tx.set(
      subRef,
      {
        challenge_id: params.challengeId,
        passed: prev?.passed || params.passed,
        attempts: (prev?.attempts ?? 0) + 1,
        code_snapshot: params.code,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (xpAwarded > 0) {
      tx.update(userRef, { total_xp: FieldValue.increment(xpAwarded) });
    }
    return { xpAwarded };
  });
}
