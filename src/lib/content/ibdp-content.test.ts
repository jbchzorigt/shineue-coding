import { test } from "node:test";
import assert from "node:assert/strict";
import { checkChallengeFile, checkLessonStructure, checkModuleMeta } from "@/lib/content/ibdp";
import { loadIbdpContent } from "@/lib/content/ibdp-files";
import { mdxError } from "@/lib/mdx-check";

const loaded = loadIbdpContent();

test("IB DP lessons: frontmatter, template and MDX", async () => {
  for (const m of loaded) {
    assert.deepEqual(checkModuleMeta(m.meta, m.module), [], `${m.module.id} frontmatter`);
    assert.deepEqual(checkLessonStructure(m.lesson, m.module), [], `${m.module.id} template`);
    assert.equal(await mdxError(m.lesson), null, `${m.module.id} MDX`);
  }
});

test("IB DP challenge files are complete and consistent", () => {
  for (const m of loaded) {
    assert.deepEqual(checkChallengeFile(m.challenges, m.module), [], `${m.module.id} challenges`);
  }
});

test("IB DP challenge ids are unique across modules", () => {
  const ids = loaded.flatMap((m) =>
    ((m.challenges as { challenges?: { id: string }[] } | null)?.challenges ?? []).map((c) => c.id)
  );
  assert.equal(new Set(ids).size, ids.length);
});
