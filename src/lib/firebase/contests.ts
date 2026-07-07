import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
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

export interface ContestProblem {
  id: string;
  title: string;
  prompt: string;
  order: number;
  /** Max score; partial credit per passed test. */
  points: number;
  starter_code?: string;
  public_test_cases: PublicTestCase[];
}

export interface ContestProblemPrivate {
  hidden_test_cases: PublicTestCase[];
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

const CONTESTS = "contests";

/* ------------------------------- contests ------------------------------ */

function toContest(snap: FirebaseFirestore.DocumentSnapshot): Contest {
  const d = snap.data()!;
  return {
    id: snap.id,
    title: d.title ?? snap.id,
    description: d.description ?? "",
    starts_at: (d.starts_at as Timestamp).toMillis(),
    ends_at: (d.ends_at as Timestamp).toMillis(),
  };
}

export async function listContests(): Promise<Contest[]> {
  const snap = await getDb().collection(CONTESTS).get();
  return snap.docs.map(toContest).sort((a, b) => b.starts_at - a.starts_at);
}

export async function getContest(id: string): Promise<Contest | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const snap = await getDb().collection(CONTESTS).doc(id).get();
  return snap.exists ? toContest(snap) : null;
}

export async function upsertContest(contest: Contest): Promise<void> {
  const { id, starts_at, ends_at, ...rest } = contest;
  await getDb().collection(CONTESTS).doc(id).set({
    ...rest,
    starts_at: Timestamp.fromMillis(starts_at),
    ends_at: Timestamp.fromMillis(ends_at),
  });
}

export async function deleteContest(id: string): Promise<void> {
  const db = getDb();
  await db.recursiveDelete(db.collection(CONTESTS).doc(id));
}

/* ------------------------------- problems ------------------------------ */

export async function listProblems(contestId: string): Promise<ContestProblem[]> {
  const snap = await getDb().collection(`${CONTESTS}/${contestId}/problems`).get();
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<ContestProblem, "id">), id: d.id }))
    .sort((a, b) => a.order - b.order);
}

export async function getProblem(
  contestId: string,
  problemId: string
): Promise<ContestProblem | null> {
  const snap = await getDb()
    .doc(`${CONTESTS}/${contestId}/problems/${problemId}`)
    .get();
  return snap.exists
    ? { ...(snap.data() as Omit<ContestProblem, "id">), id: snap.id }
    : null;
}

export async function getProblemPrivate(
  contestId: string,
  problemId: string
): Promise<ContestProblemPrivate | null> {
  const snap = await getDb()
    .doc(`${CONTESTS}/${contestId}/problems/${problemId}/private/answers`)
    .get();
  return snap.exists ? (snap.data() as ContestProblemPrivate) : null;
}

export async function upsertProblem(
  contestId: string,
  problem: ContestProblem,
  privateData: ContestProblemPrivate
): Promise<void> {
  const db = getDb();
  const { id, ...data } = problem;
  const ref = db.doc(`${CONTESTS}/${contestId}/problems/${id}`);
  const batch = db.batch();
  batch.set(ref, data);
  batch.set(ref.collection("private").doc("answers"), privateData);
  await batch.commit();
}

export async function deleteProblem(contestId: string, problemId: string): Promise<void> {
  const db = getDb();
  await db.recursiveDelete(db.doc(`${CONTESTS}/${contestId}/problems/${problemId}`));
}

/* ----------------------------- participants ---------------------------- */

function toParticipant(snap: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): Participant {
  const d = snap.data()!;
  return {
    uid: snap.id,
    name: d.name ?? null,
    email: d.email ?? "",
    scores: d.scores ?? {},
    total: d.total ?? 0,
    last_improved_at: d.last_improved_at ? (d.last_improved_at as Timestamp).toMillis() : null,
  };
}

export async function getParticipant(
  contestId: string,
  uid: string
): Promise<Participant | null> {
  const snap = await getDb().doc(`${CONTESTS}/${contestId}/participants/${uid}`).get();
  return snap.exists ? toParticipant(snap) : null;
}

/** Ranked: total desc, earlier improvement wins ties. */
export async function listParticipants(contestId: string): Promise<Participant[]> {
  const snap = await getDb().collection(`${CONTESTS}/${contestId}/participants`).get();
  return snap.docs.map(toParticipant).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return (a.last_improved_at ?? Infinity) - (b.last_improved_at ?? Infinity);
  });
}

export async function registerParticipant(
  contestId: string,
  user: { uid: string; name: string | null; email: string }
): Promise<void> {
  const ref = getDb().doc(`${CONTESTS}/${contestId}/participants/${user.uid}`);
  try {
    await ref.create({
      name: user.name,
      email: user.email,
      scores: {},
      total: 0,
      last_improved_at: null,
      registered_at: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if ((err as { code?: number }).code !== 6 /* ALREADY_EXISTS */) throw err;
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
  const db = getDb();
  const ref = db.doc(`${CONTESTS}/${params.contestId}/participants/${params.uid}`);

  // Attempt audit trail (outside the transaction — append-only).
  await ref.collection("submissions").add({
    problem_id: params.problemId,
    code: params.code,
    score: params.score,
    passed_tests: params.passedTests,
    total_tests: params.totalTests,
    submitted_at: FieldValue.serverTimestamp(),
  });

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Оролцогч бүртгэлгүй байна.");
    const scores: Record<string, number> = snap.data()!.scores ?? {};
    const prev = scores[params.problemId] ?? 0;
    if (params.score <= prev) {
      return { improved: false, bestScore: prev };
    }
    scores[params.problemId] = params.score;
    const total = Object.values(scores).reduce((s, x) => s + x, 0);
    tx.update(ref, {
      scores,
      total,
      last_improved_at: FieldValue.serverTimestamp(),
    });
    return { improved: true, bestScore: params.score };
  });
}
