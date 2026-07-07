import "server-only";

import { getDb } from "@/lib/firebase/admin";
import type { Challenge, ChallengePrivate } from "@/lib/types";

const CHALLENGES = "challenges";

export async function getChallenge(id: string): Promise<Challenge | null> {
  const snap = await getDb().collection(CHALLENGES).doc(id).get();
  if (!snap.exists) return null;
  return { ...(snap.data() as Omit<Challenge, "id">), id: snap.id };
}

/** Server-side only — hidden tests must never be serialized to the client. */
export async function getChallengePrivate(id: string): Promise<ChallengePrivate | null> {
  const snap = await getDb()
    .collection(CHALLENGES)
    .doc(id)
    .collection("private")
    .doc("answers")
    .get();
  return snap.exists ? (snap.data() as ChallengePrivate) : null;
}

export async function listChallengesByModule(moduleId: string): Promise<Challenge[]> {
  const snap = await getDb()
    .collection(CHALLENGES)
    .where("module_id", "==", moduleId)
    .get();
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<Challenge, "id">), id: d.id }))
    .sort((a, b) => a.order - b.order);
}

/** Writes public + private parts together (teacher content editor). */
export async function upsertChallenge(
  challenge: Challenge,
  privateData: ChallengePrivate
): Promise<void> {
  const db = getDb();
  const { id, ...publicData } = challenge;
  const ref = db.collection(CHALLENGES).doc(id);
  const batch = db.batch();
  batch.set(ref, publicData);
  batch.set(ref.collection("private").doc("answers"), privateData);
  await batch.commit();
}

export async function deleteChallenge(id: string): Promise<void> {
  const db = getDb();
  await db.recursiveDelete(db.collection(CHALLENGES).doc(id));
}
