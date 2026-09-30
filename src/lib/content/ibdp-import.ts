import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { challenges, modules } from "@/lib/db/schema";
import { upsertModule } from "@/lib/db/modules";
import { upsertChallenge } from "@/lib/db/challenges";
import {
  challengeRows,
  checkChallengeFile,
  checkLessonStructure,
  checkModuleMeta,
  type ChallengeFile,
} from "@/lib/content/ibdp";
import type { LoadedModule } from "@/lib/content/ibdp-files";

/**
 * Upserts only the given IB DP modules and their challenges — modules
 * 01–07 and anything teachers edited stay as they are. All-or-nothing on
 * validation. Challenges no longer in a file are reported, never deleted
 * (deleting would take students' submissions with them).
 */
export async function importIbdp(
  loaded: LoadedModule[]
): Promise<{ modules: number; challenges: number; stale: string[] }> {
  const problems = loaded.flatMap((m) =>
    [
      ...checkModuleMeta(m.meta, m.module),
      ...checkLessonStructure(m.lesson, m.module),
      ...checkChallengeFile(m.challenges, m.module),
    ].map((p) => `${m.module.id}: ${p}`)
  );
  if (problems.length > 0) throw new Error(`IB DP content has problems:\n${problems.join("\n")}`);

  let count = 0;
  const stale: string[] = [];
  for (const m of loaded) {
    await upsertModule({
      id: m.module.id,
      title: String(m.meta.title),
      order: m.module.order,
      syllabus_ref: m.module.ref,
      description: String(m.meta.description),
      lesson_mdx: m.lesson,
    });
    const rows = challengeRows(m.challenges as ChallengeFile);
    for (const { challenge, priv } of rows) {
      await upsertChallenge(challenge, priv);
      count++;
    }
    const inFile = new Set(rows.map((r) => r.challenge.id));
    const inDb = await getDb()
      .select({ id: challenges.id })
      .from(challenges)
      .where(eq(challenges.module_id, m.module.id));
    stale.push(...inDb.map((r) => r.id).filter((id) => !inFile.has(id)));
  }

  // module-03 teaches B2.1 basics; relabel it only if nobody changed the old label.
  await getDb()
    .update(modules)
    .set({ syllabus_ref: "B2.1" })
    .where(and(eq(modules.id, "module-03"), inArray(modules.syllabus_ref, ["B1.1"])));

  return { modules: loaded.length, challenges: count, stale: stale.sort() };
}
