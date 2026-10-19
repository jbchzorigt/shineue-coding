/**
 * Read-only check that the database holds the IB DP content exactly as in the files.
 * Local:      npm run script -- scripts/verify-ibdp.ts
 * Production: npm.cmd run script:prod -- scripts/verify-ibdp.ts
 */
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client";
import { loadIbdpContent } from "../src/lib/content/ibdp-files";
import type { ChallengeFile } from "../src/lib/content/ibdp";

interface ModuleRow { id: string; order: number; syllabus_ref: string; lesson_mdx: string }
interface ChallengeRow { id: string; module_id: string; has_answer: boolean }

async function main() {
  const db = getDb();
  const loaded = loadIbdpContent();
  const ids = loaded.map((m) => m.module.id);
  const modules = (await db.execute(sql`
    select id, "order", syllabus_ref, lesson_mdx from modules
    where id in ${sql.raw(`(${[...ids, "module-03"].map((i) => `'${i}'`).join(",")})`)}
  `)) as unknown as ModuleRow[];
  const challenges = (await db.execute(sql`
    select c.id, c.module_id, (a.challenge_id is not null) as has_answer
    from challenges c left join challenge_answers a on a.challenge_id = c.id
    where c.module_id in ${sql.raw(`(${ids.map((i) => `'${i}'`).join(",")})`)}
  `)) as unknown as ChallengeRow[];

  const problems: string[] = [];
  for (const m of loaded) {
    const row = modules.find((r) => r.id === m.module.id);
    if (!row) { problems.push(`${m.module.id}: module missing`); continue; }
    if (row.order !== m.module.order) problems.push(`${m.module.id}: order ${row.order} ≠ ${m.module.order}`);
    if (row.syllabus_ref !== m.module.ref) problems.push(`${m.module.id}: syllabus_ref ${row.syllabus_ref}`);
    if (row.lesson_mdx.trim() !== m.lesson.trim()) problems.push(`${m.module.id}: lesson text differs from the file`);
    const want = (m.challenges as ChallengeFile).challenges.map((c) => c.id).sort();
    const have = challenges.filter((c) => c.module_id === m.module.id);
    const missing = want.filter((id) => !have.some((c) => c.id === id));
    const extra = have.filter((c) => !want.includes(c.id)).map((c) => c.id);
    const noAnswer = have.filter((c) => !c.has_answer).map((c) => c.id);
    if (missing.length) problems.push(`${m.module.id}: missing ${missing.join(", ")}`);
    if (extra.length) problems.push(`${m.module.id}: extra ${extra.join(", ")}`);
    if (noAnswer.length) problems.push(`${m.module.id}: no answer row for ${noAnswer.join(", ")}`);
    console.log(`${m.module.id}  order ${row.order}  ${row.syllabus_ref}  ${have.length}/${want.length} challenges`);
  }
  const m03 = modules.find((r) => r.id === "module-03");
  console.log(`module-03  ${m03?.syllabus_ref ?? "missing"}`);
  console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "all match the files");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
