import "server-only";

import { listChallengeModules, listChallengesByModule } from "@/lib/db/challenges";
import { listPassedChallengeIds } from "@/lib/db/submissions";
import { listModuleOutlines, listModules, type ModuleOutline } from "@/lib/db/modules";
import { unlockModule } from "@/lib/db/users";
import { isStaff, type UserProfile } from "@/lib/types";
import { computeUnlocked } from "@/lib/unlock";

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
  const lessons = await listModules();
  const [passedIds, perModule] = await Promise.all([
    listPassedChallengeIds(uid),
    Promise.all(lessons.map((l) => listChallengesByModule(l.id))),
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
 * The modules this student may open, in course order (rules in unlock.ts).
 * Any the rules open that the profile doesn't list yet are saved, so they
 * stay open even if the course changes again.
 */
export async function openModules(
  uid: string,
  stored: readonly string[]
): Promise<ModuleOutline[]> {
  const [lessons, refs, passed] = await Promise.all([
    listModuleOutlines(),
    listChallengeModules(),
    listPassedChallengeIds(uid),
  ]);
  const byModule = new Map<string, string[]>();
  for (const ref of refs) {
    byModule.set(ref.module_id, [...(byModule.get(ref.module_id) ?? []), ref.id]);
  }

  const open = new Set(
    computeUnlocked(
      lessons.map((l) => ({ id: l.id, order: l.order, challengeIds: byModule.get(l.id) ?? [] })),
      passed,
      stored
    )
  );
  for (const id of open) {
    if (!stored.includes(id)) await unlockModule(uid, id);
  }
  return lessons.filter((l) => open.has(l.id));
}

/** Staff open every module; a student only those openModules allows. */
export async function canOpenModule(
  profile: UserProfile | null,
  moduleId: string
): Promise<boolean> {
  if (!profile) return false;
  if (isStaff(profile.role)) return true;
  const open = await openModules(profile.uid, profile.unlocked_modules);
  return open.some((m) => m.id === moduleId);
}

/** After a passed submission: the first module that has just opened, if any. */
export async function newlyOpenedModule(
  uid: string,
  before: readonly ModuleOutline[]
): Promise<{ id: string; title: string } | null> {
  const wasOpen = new Set(before.map((m) => m.id));
  const next = (await openModules(uid, [...wasOpen])).find((m) => !wasOpen.has(m.id));
  return next ? { id: next.id, title: next.title } : null;
}
