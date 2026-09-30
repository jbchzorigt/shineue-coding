/*
 * Which modules a student may open. The course is a sequence of steps:
 * modules sharing an order number form one step and open together, and
 * the next step opens once every module of this one is finished (a module
 * without challenges counts as finished). Worked out from progress each
 * time, so a module a teacher adds later opens for everyone already past
 * it; modules opened before (the stored list) stay open.
 */

export interface ModuleStep {
  id: string;
  order: number;
  challengeIds: string[];
}

/** Ids of the open modules, in course order. */
export function computeUnlocked(
  modules: readonly ModuleStep[],
  passed: ReadonlySet<string>,
  stored: readonly string[]
): string[] {
  const sorted = [...modules].sort(
    (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const kept = new Set(stored);
  const open: string[] = [];

  let stepOpen = true;
  for (let i = 0; i < sorted.length; ) {
    const step = sorted.filter((mod) => mod.order === sorted[i].order);
    i += step.length;

    const opened = step.filter((mod) => stepOpen || kept.has(mod.id));
    open.push(...opened.map((mod) => mod.id));
    stepOpen =
      opened.length === step.length &&
      step.every((mod) => mod.challengeIds.every((id) => passed.has(id)));
  }
  return open;
}
