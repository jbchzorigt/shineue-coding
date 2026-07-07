import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { listChallengesByModule } from "@/lib/firebase/challenges";
import { listPassedChallengeIds } from "@/lib/firebase/submissions";
import { listLessons } from "@/lib/content";

/** 100 XP per level, level 1 at 0 XP. */
export function levelFromXp(totalXp: number): {
  level: number;
  progress: number;
  nextLevelXp: number;
} {
  const level = Math.floor(totalXp / 100) + 1;
  const intoLevel = totalXp % 100;
  return { level, progress: intoLevel, nextLevelXp: 100 };
}

export interface CourseProgress {
  totalChallenges: number;
  passedChallenges: number;
  complete: boolean;
}

/**
 * The course is complete when every challenge of every module is passed.
 * (Every module is guaranteed at least one challenge by the seed data —
 * a challenge-less module would otherwise be uncompletable.)
 */
export async function getCourseProgress(uid: string): Promise<CourseProgress> {
  const lessons = listLessons();
  const [passedIds, perModule] = await Promise.all([
    listPassedChallengeIds(uid),
    Promise.all(lessons.map((l) => listChallengesByModule(l.module_id))),
  ]);

  const all = perModule.flat();
  const passed = all.filter((ch) => passedIds.has(ch.id)).length;
  return {
    totalChallenges: all.length,
    passedChallenges: passed,
    complete: all.length > 0 && passed === all.length,
  };
}

/**
 * Called after a successful submission: if every challenge of the module
 * is now passed, unlocks the next module (by lesson order).
 * Returns the newly unlocked module, or null.
 */
export async function maybeUnlockNextModule(
  uid: string,
  moduleId: string,
  alreadyUnlocked: string[]
): Promise<{ id: string; title: string } | null> {
  const [challenges, passedIds] = await Promise.all([
    listChallengesByModule(moduleId),
    listPassedChallengeIds(uid),
  ]);
  if (challenges.length === 0) return null;
  if (!challenges.every((ch) => passedIds.has(ch.id))) return null;

  const lessons = listLessons();
  const current = lessons.find((l) => l.module_id === moduleId);
  if (!current) return null;
  const next = lessons.find((l) => l.order === current.order + 1);
  if (!next || alreadyUnlocked.includes(next.module_id)) return null;

  await getDb()
    .doc(`users/${uid}`)
    .update({ unlocked_modules: FieldValue.arrayUnion(next.module_id) });

  return { id: next.module_id, title: next.title };
}
