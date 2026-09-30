import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { addChallenge, addModule, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { challenges, modules } from "@/lib/db/schema";
import { IBDP_MODULES } from "@/lib/content/ibdp";
import type { LoadedModule } from "@/lib/content/ibdp-files";
import { importIbdp } from "@/lib/content/ibdp-import";

beforeEach(resetDb);
after(closeDb);

const A44 = IBDP_MODULES.find((m) => m.id === "a4-4")!;
const SECTION = (ref: string) =>
  `## ${ref} Гарчиг\n\n> 🎯 **Зорилго:** x\n\n### 🤔 Бодоод үзээрэй\n\nx\n\n### 📖 Гол ойлголт\n\nx\n\n<Callout type="warning">\n**⚠️ Анхаарах зүйлс**\n</Callout>\n\n### 📝 Түлхүүр нэр томьёо\n\nx\n\n### ✅ Өөрийгөө шалга\n\nx\n`;

function a44(): LoadedModule {
  return {
    module: A44,
    meta: { module_id: "a4-4", syllabus_ref: "A4.4", order: 18, title: "A4.4 Машин сургалтын ёс зүй", description: "Машин сургалтын ёс зүйн асуудлуудыг хэлэлцэнэ." },
    lesson: `Танилцуулга\n\n${SECTION("A4.4.1")}\n${SECTION("A4.4.2")}\n## Дүгнэлт\n\nx`,
    challenges: {
      module_id: "a4-4",
      challenges: [
        { id: "a4-4-01-mcq", section: "A4.4.1", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b"], answer: 1 },
        { id: "a4-4-01-mcq2", section: "A4.4.1", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b"], answer: 0 },
        { id: "a4-4-02-mcq", section: "A4.4.2", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b"], answer: 0 },
        { id: "a4-4-02-trace", section: "A4.4.2", type: "tracing", title: "T", prompt: "P", xp: 15, expected: "1" },
        { id: "a4-4-exam", type: "theory", title: "T", prompt: "P [4]", xp: 20, mark_scheme: "• x [1]" },
      ],
    },
  };
}

test("importIbdp upserts the given modules and their challenges in order", async () => {
  const r = await importIbdp([a44()]);
  assert.deepEqual(r, { modules: 1, challenges: 5, stale: [] });
  const [mod] = await getDb().select().from(modules).where(eq(modules.id, "a4-4"));
  assert.equal(mod.order, 18);
  assert.equal(mod.syllabus_ref, "A4.4");
  assert.match(mod.lesson_mdx, /^Танилцуулга/);
  const rows = await getDb().select().from(challenges).where(eq(challenges.module_id, "a4-4"));
  assert.deepEqual(rows.sort((a, b) => a.order - b.order).map((c) => c.id), [
    "a4-4-01-mcq", "a4-4-01-mcq2", "a4-4-02-mcq", "a4-4-02-trace", "a4-4-exam",
  ]);
  // Re-importing is idempotent.
  assert.deepEqual(await importIbdp([a44()]), { modules: 1, challenges: 5, stale: [] });
});

test("importIbdp leaves modules 01–07 alone, except module-03's old label", async () => {
  await addModule("module-01", 1);
  await getDb().update(modules).set({ title: "Багшийн засвар" }).where(eq(modules.id, "module-01"));
  await addModule("module-03", 3);
  await getDb().update(modules).set({ syllabus_ref: "B1.1" }).where(eq(modules.id, "module-03"));
  await importIbdp([a44()]);
  const byId = Object.fromEntries((await getDb().select().from(modules)).map((m) => [m.id, m]));
  assert.equal(byId["module-01"].title, "Багшийн засвар");
  assert.equal(byId["module-03"].syllabus_ref, "B2.1");
  await getDb().update(modules).set({ syllabus_ref: "Teacher's own" }).where(eq(modules.id, "module-03"));
  await importIbdp([a44()]);
  const [m3] = await getDb().select().from(modules).where(eq(modules.id, "module-03"));
  assert.equal(m3.syllabus_ref, "Teacher's own");
});

test("importIbdp refuses broken content and writes nothing", async () => {
  const bad = a44();
  (bad.challenges as { challenges: unknown[] }).challenges.pop();
  await assert.rejects(importIbdp([a44(), bad]), /exactly 1 theory/);
  assert.equal((await getDb().select().from(modules)).length, 0);
  assert.equal((await getDb().select().from(challenges)).length, 0);
});

test("importIbdp reports challenges in the database that the file no longer has", async () => {
  await importIbdp([a44()]);
  await addChallenge("a4-4-old", "a4-4");
  const r = await importIbdp([a44()]);
  assert.deepEqual(r.stale, ["a4-4-old"]);
});
