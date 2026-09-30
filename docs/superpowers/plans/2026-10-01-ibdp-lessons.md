# IB DP Lessons as Platform Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the 80 PPTX lessons in `D:\2026-2027 lessons\IBDP-CS\` into 19 clean, self-study modules (Mongolian lessons + ~179 auto-checked challenges) on two parallel unlock tracks.

**Architecture:** Content is data. Each module is one MDX lesson (`content/modules/<id>.mdx`) and one challenge file (`content/challenges/<id>.json`). A pure module (`src/lib/content/ibdp.ts`) holds the module list and validates and maps the files. A content test gates every file in `npm test`, and `check-solutions` proves every coding and tracing answer on the real Piston grader. One importer (`importIbdp`) upserts only these 19 modules, both locally and in production. Content is written in 6 batches, each ending at a user checkpoint.

**Tech Stack:** Next.js 16 / MDX (next-mdx-remote 6, remark-gfm), Drizzle + Postgres, `node:test` via tsx, Piston (Python 3.12, sqlite3 3.27), gray-matter.

**Spec:** `docs/superpowers/specs/2026-10-01-ibdp-lessons-design.md`

## Global Constraints

- **No commits.** The user commits via "final code". Leave the work uncommitted and record each task in the ledger.
- **Module IDs, orders and refs** are exactly as in `IBDP_MODULES` (Task 1). Titles and descriptions are exactly as in Task 6+ frontmatter blocks.
- **Language:**
  - Explanations are in Mongolian. A key term appears in English in parentheses the first time it is used: `стек (stack)`.
  - IB command terms stay in English: Explain, Construct, Describe, Compare…
  - Code, identifiers and comments inside code are in English.
- **Source fidelity:**
  - Teach what the PPTX teaches for that syllabus point (objectives, examples, misconceptions). The PPTX slides and speaker notes are the source of truth for scope.
  - Never copy textbook (PDF) text. Page references like `Сурах бичиг: B2.2.3, 352–355-р тал` are allowed, taken from the PPTX title slide.
- **Lesson template** (enforced by `checkLessonStructure`): every section is `## <ref> <Mongolian title>`, with ` <HL />` after the title for HL lessons. The section block contains, in this order:
  - `> 🎯 **Зорилго:**`
  - `### 🤔 Бодоод үзээрэй`
  - `### 📖 Гол ойлголт`
  - `### 💻 Туршиж үзээрэй` (optional: only when a demo fits)
  - `<Callout type="warning">` starting `**⚠️ Анхаарах зүйлс**`
  - `### 📝 Түлхүүр нэр томьёо` (a table `| Монгол | English | Тайлбар |`)
  - `### ✅ Өөрийгөө шалга`
- **Reveal answers** with `<details><summary>Хариу</summary>…</details>` (blank lines inside around markdown).
- **Lesson opening and closing:** the file starts with an intro (why it matters, section list, ~time) and ends with `## Дүгнэлт` containing **Шалгалтад анхаар** bullets.
- **MDX:**
  - Self-close void tags.
  - Never put a bare `<` or `{` in prose. Write "бага" / "<" inside backticks, or `&lt;`.
  - Every code fence has a language.
  - Every file must pass `mdxError`.
- **Engagement:** short paragraphs (≤ 4 sentences); a real-world hook per section (Mongolian context where natural: school, UB traffic, Khan Bank app, Mongolian mobile networks…); at least one table or code example per section; no walls of text.
- **Size:** 80–220 lines of MDX per section.
- **Demos** (`💻`) are adapted from the folder's `.py` files and must be valid Python 3.12. Anything needing sockets, threads, `time.sleep` loops or files on disk is labelled «Өөрийн компьютер дээр ажиллуулж үзээрэй».
- **Challenges** (enforced by `checkChallengeFile`):
  - Each section needs ≥ 2 challenges; programming modules (`CODING_MODULES`) need ≥ 1 `coding` per section; each module has exactly 1 `theory` with no `section`.
  - IDs look like `<module-id>-<nn>-<kind>` (e.g. `a1-3-03-trace`); the exam one is `<module-id>-exam`. Never rename an ID after import.
  - XP: mcq 10, tracing 15, coding 20, theory 20.
  - mcq: 4 options, one correct; the distractors are real misconceptions; vary the correct index.
  - tracing: the prompt's ```` ```python ```` block uses no `input()` and runs under 1 s; `expected` is its exact stdout.
  - coding: stdin → stdout, with an example block in the prompt; ≥ 2 `tests` + ≥ 3 `hidden_tests` including edge cases; `solution` is idiomatic and checked; optional `starter_code`; always a `hint`.
  - theory: an IB command term plus marks (`[4]`); `mark_scheme` is bullets `• … [1]`.
  - SQL coding (A3.x) uses Python `sqlite3` with an in-memory DB built in the solution or starter code.
- **Tests:**
  - Single file: `npx tsx --env-file=.env.local --conditions=react-server --test <file>`.
  - Suite: `npm test`. Content tests run inside it.
- **Tools:** Windows. Run Python extraction with `PYTHONIOENCODING=utf-8`. Keep the dev server via `preview_start` name `dev`. Never touch `shineue-db` or port 5432.
- **Workspace:** `.superpowers/sdd/2026-10-01-ibdp-lessons/` (git-ignored) holds the ledger and the extracted PPTX sources (`source/<module-id>/`).

## Review Focus

1. **MDX that compiles but renders wrong**, e.g. a `<details>` without blank lines swallowing markdown, or a table broken by a `|` inside code. Browser-check every module (module tasks, last step).
2. **Tracing prompts whose code differs from what `expected` was computed from**, e.g. an edited prompt. Guarded by `check-solutions` running the prompt's own code.
3. **Wrong science:** misstatements versus the PPTX or syllabus (e.g. SJF vs SRTF, 2NF definitions, TCP vs UDP guarantees). Reviewer reads each batch against the source.
4. **Re-import after an edit** must not duplicate or reorder IDs, and must not touch modules 01–07. Tested in Task 3; stale IDs are reported.
5. **Unlock pairs:** the pair at order 8 opens after module-07; a lesson-only (challenge-less) module never ships (every module has challenges). Browser-check the first batch with a student view if a session is available, otherwise rely on the Task 3 test and the unlock tests.

---

### Task 1: IB DP module list, validators and the `<HL />` badge

**Files:**
- Create: `src/lib/content/ibdp.ts`, `src/lib/content/ibdp.test.ts`
- Modify: `src/components/mdx/mdx-content.tsx` (add `HL` to `components`)

**Interfaces:**
- Consumes: `Challenge`, `ChallengePrivate` from `@/lib/types`.
- Produces:
  - `IBDP_MODULES: readonly IbdpModule[]` (`{ id, ref, order, sections }`) and `CODING_MODULES: ReadonlySet<string>`
  - Types `ContentChallenge`, `ChallengeFile`, `TestIO`
  - `checkModuleMeta(meta: Record<string, unknown>, mod: IbdpModule): string[]`
  - `checkLessonStructure(lesson: string, mod: IbdpModule): string[]`
  - `checkChallengeFile(raw: unknown, mod: IbdpModule): string[]`
  - `challengeRows(file: ChallengeFile): { challenge: Challenge; priv: ChallengePrivate }[]`
  - `pythonBlocks(markdown: string): string[]`

- [ ] **Step 1: Write the failing test** `src/lib/content/ibdp.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  IBDP_MODULES,
  challengeRows,
  checkChallengeFile,
  checkLessonStructure,
  checkModuleMeta,
  pythonBlocks,
  type ChallengeFile,
} from "@/lib/content/ibdp";

const mod = (id: string) => IBDP_MODULES.find((m) => m.id === id)!;
const A44 = mod("a4-4"); // 2 sections, theory module
const B25 = mod("b2-5"); // 1 section, programming module

function a44File(): ChallengeFile {
  return {
    module_id: "a4-4",
    challenges: [
      { id: "a4-4-01-mcq", section: "A4.4.1", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b", "c", "d"], answer: 2 },
      { id: "a4-4-01-trace", section: "A4.4.1", type: "tracing", title: "T", prompt: "P", xp: 15, expected: "42", hint: "h" },
      { id: "a4-4-02-mcq", section: "A4.4.2", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b", "c", "d"], answer: 0 },
      { id: "a4-4-02-mcq2", section: "A4.4.2", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b", "c", "d"], answer: 3 },
      { id: "a4-4-exam", type: "theory", title: "T", prompt: "Explain … [4]", xp: 20, mark_scheme: "• x [1]" },
    ],
  };
}
const io = (input: string, output: string) => ({ input, output });

test("the module list: 19 modules, 80 sections, two tracks sharing order numbers", () => {
  assert.equal(IBDP_MODULES.length, 19);
  assert.equal(IBDP_MODULES.reduce((n, m) => n + m.sections.length, 0), 80);
  assert.deepEqual(IBDP_MODULES.filter((m) => m.order === 8).map((m) => m.id), ["a1-3", "b1-1"]);
  assert.deepEqual(mod("a4-3").sections.slice(-2), ["A4.3.9", "A4.3.10"]);
  assert.equal(new Set(IBDP_MODULES.map((m) => m.id)).size, 19);
});

test("a complete challenge file has no problems", () => {
  assert.deepEqual(checkChallengeFile(a44File(), A44), []);
});

test("challenge file problems are named", () => {
  const f = a44File();
  f.challenges[0] = { ...f.challenges[0], id: "a4-4-01-trace" }; // duplicate
  (f.challenges[2] as { answer: number }).answer = 4; // out of range
  (f.challenges[1] as { expected: string }).expected = " "; // empty
  const problems = checkChallengeFile(f, A44);
  assert.ok(problems.some((p) => p.includes("duplicate id a4-4-01-trace")), problems.join("\n"));
  assert.ok(problems.some((p) => p.includes("a4-4-02-mcq: answer")), problems.join("\n"));
  assert.ok(problems.some((p) => p.includes("a4-4-01-trace: expected")), problems.join("\n"));

  assert.ok(checkChallengeFile({ ...a44File(), module_id: "x" }, A44).some((p) => p.includes("module_id")));
  const noExam = a44File();
  noExam.challenges.pop();
  assert.ok(checkChallengeFile(noExam, A44).some((p) => p.includes("exactly 1 theory")));
  const thin = a44File();
  thin.challenges.splice(2, 1);
  assert.ok(checkChallengeFile(thin, A44).some((p) => p.includes("section A4.4.2 has 1")));
  const stray = a44File();
  stray.challenges[0] = { ...stray.challenges[0], section: "A4.4.9" };
  assert.ok(checkChallengeFile(stray, A44).some((p) => p.includes("unknown section A4.4.9")));
  const badPrefix = a44File();
  badPrefix.challenges[0] = { ...badPrefix.challenges[0], id: "zz-01-mcq" };
  assert.ok(checkChallengeFile(badPrefix, A44).some((p) => p.includes("must start with a4-4-")));
  assert.deepEqual(checkChallengeFile("nope", A44), ["not a challenge file"]);
});

test("programming modules need a checked coding task in every section", () => {
  const base = {
    module_id: "b2-5",
    challenges: [
      { id: "b2-5-01-mcq", section: "B2.5.1", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b", "c", "d"], answer: 1 },
      { id: "b2-5-01-code", section: "B2.5.1", type: "coding", title: "T", prompt: "P", xp: 20, hint: "h",
        tests: [io("1", "1"), io("2", "2")], hidden_tests: [io("3", "3"), io("4", "4"), io("5", "5")], solution: "print(input())" },
      { id: "b2-5-exam", type: "theory", title: "T", prompt: "P [4]", xp: 20, mark_scheme: "• x [1]" },
    ],
  } as ChallengeFile;
  assert.deepEqual(checkChallengeFile(base, B25), []);
  const noCode = structuredClone(base);
  noCode.challenges[1] = { id: "b2-5-01-mcq2", section: "B2.5.1", type: "mcq", title: "T", prompt: "P", xp: 10, options: ["a", "b", "c", "d"], answer: 0 };
  assert.ok(checkChallengeFile(noCode, B25).some((p) => p.includes("needs a coding challenge")));
  const weak = structuredClone(base);
  Object.assign(weak.challenges[1], { hidden_tests: [io("3", "3")], solution: "" });
  const problems = checkChallengeFile(weak, B25);
  assert.ok(problems.some((p) => p.includes("b2-5-01-code: needs ≥ 3 hidden_tests")), problems.join("\n"));
  assert.ok(problems.some((p) => p.includes("b2-5-01-code: solution")), problems.join("\n"));
});

test("challengeRows: order, public/private split, hints flagged", () => {
  const rows = challengeRows(a44File());
  assert.deepEqual(rows.map((r) => r.challenge.order), [1, 2, 3, 4, 5]);
  assert.deepEqual(rows[0].challenge.options, ["a", "b", "c", "d"]);
  assert.equal(rows[0].priv.correct_answer_index, 2);
  assert.equal(rows[0].challenge.has_hint, false);
  assert.equal(rows[1].priv.expected_answer, "42");
  assert.equal(rows[1].challenge.has_hint, true);
  assert.equal(rows[1].priv.hint, "h");
  assert.equal(rows[4].priv.mark_scheme, "• x [1]");
  assert.equal(rows[4].challenge.module_id, "a4-4");
  assert.equal(rows[4].challenge.xp_reward, 20);

  const code = challengeRows({
    module_id: "b2-5",
    challenges: [{ id: "b2-5-01-code", section: "B2.5.1", type: "coding", title: "T", prompt: "P", xp: 20,
      starter_code: "# code", tests: [io("1", "1")], hidden_tests: [io("2", "2")], solution: "print(input())" }],
  })[0];
  assert.equal(code.challenge.language, "python");
  assert.equal(code.challenge.starter_code, "# code");
  assert.deepEqual(code.challenge.public_test_cases, [{ input: "1", expected_output: "1" }]);
  assert.deepEqual(code.priv.hidden_test_cases, [{ input: "2", expected_output: "2" }]);
  assert.equal("solution" in code.challenge || "solution" in code.priv, false);
});

test("checkModuleMeta: frontmatter must match the module list", () => {
  const ok = { module_id: "a4-4", syllabus_ref: "A4.4", order: 18, title: "A4.4 Машин сургалтын ёс зүй", description: "Урт бөгөөд утгатай нэг өгүүлбэр тайлбар." };
  assert.deepEqual(checkModuleMeta(ok, A44), []);
  assert.ok(checkModuleMeta({ ...ok, order: 9 }, A44).some((p) => p.includes("order")));
  assert.ok(checkModuleMeta({ ...ok, title: "Ёс зүй" }, A44).some((p) => p.includes("title")));
  assert.ok(checkModuleMeta({ ...ok, description: "Богино" }, A44).some((p) => p.includes("description")));
});

const SECTION = (ref: string) =>
  `## ${ref} Гарчиг\n\n> 🎯 **Зорилго:** x\n\n### 🤔 Бодоод үзээрэй\n\nx\n\n### 📖 Гол ойлголт\n\nx\n\n<Callout type="warning">\n**⚠️ Анхаарах зүйлс**\n</Callout>\n\n### 📝 Түлхүүр нэр томьёо\n\nx\n\n### ✅ Өөрийгөө шалга\n\nx\n`;

test("checkLessonStructure: every section, in order, with the template's parts", () => {
  const lesson = `Танилцуулга\n\n${SECTION("A4.4.1")}\n${SECTION("A4.4.2")}\n## Дүгнэлт\n\nx`;
  assert.deepEqual(checkLessonStructure(lesson, A44), []);
  assert.ok(checkLessonStructure(lesson.replace("## A4.4.2 Гарчиг", "## Гарчиг"), A44).some((p) => p.includes("A4.4.2: missing")));
  assert.ok(checkLessonStructure(lesson.replace("### 📝 Түлхүүр", "### Түлхүүр"), A44).some((p) => p.includes("📝")));
  assert.ok(checkLessonStructure(lesson.replace("## Дүгнэлт", "## Төгсгөл"), A44).some((p) => p.includes("Дүгнэлт")));
  const swapped = `x\n${SECTION("A4.4.2")}\n${SECTION("A4.4.1")}\n## Дүгнэлт\n`;
  assert.ok(checkLessonStructure(swapped, A44).some((p) => p.includes("order")));
});

test("pythonBlocks pulls fenced python code out of a prompt", () => {
  assert.deepEqual(pythonBlocks("Юу хэвлэх вэ?\n\n```python\nx = 1\nprint(x)\n```\n\n```text\nno\n```"), ["x = 1\nprint(x)"]);
  assert.deepEqual(pythonBlocks("no code"), []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/content/ibdp.test.ts`
Expected: FAIL with `Cannot find module '@/lib/content/ibdp'`.

- [ ] **Step 3: Implement** `src/lib/content/ibdp.ts`:

```ts
/*
 * The IB DP lesson modules (docs/superpowers/specs/2026-10-01-ibdp-lessons-design.md):
 * the module list, and checks + mappings for content/modules/<id>.mdx and
 * content/challenges/<id>.json. Pure, so npm test can gate every file.
 */
import type { Challenge, ChallengePrivate } from "@/lib/types";

export interface IbdpModule {
  id: string;
  /** Syllabus reference, e.g. "A1.3". */
  ref: string;
  /** Unlock step; A and B tracks share numbers and open together. */
  order: number;
  /** One per PPTX lesson, e.g. "A1.3.1". */
  sections: readonly string[];
}

const secs = (ref: string, n: number) => Array.from({ length: n }, (_, i) => `${ref}.${i + 1}`);
const m = (id: string, ref: string, order: number, n: number): IbdpModule => ({
  id,
  ref,
  order,
  sections: secs(ref, n),
});

export const IBDP_MODULES: readonly IbdpModule[] = [
  m("a1-3", "A1.3", 8, 7),
  m("b1-1", "B1.1", 8, 4),
  m("a1-4", "A1.4", 9, 1),
  m("b2-1", "B2.1", 9, 4),
  m("a2-1", "A2.1", 10, 5),
  m("b2-2", "B2.2", 10, 4),
  m("a3-1", "A3.1", 11, 1),
  m("b2-3", "B2.3", 11, 4),
  m("a3-2", "A3.2", 12, 7),
  m("b2-4", "B2.4", 12, 5),
  m("a3-3", "A3.3", 13, 6),
  m("b2-5", "B2.5", 13, 1),
  m("a3-4", "A3.4", 14, 4),
  m("b3-1", "B3.1", 14, 5),
  m("a4-1", "A4.1", 15, 2),
  m("b3-2", "B3.2", 15, 5),
  m("a4-2", "A4.2", 16, 3),
  m("a4-3", "A4.3", 17, 10),
  m("a4-4", "A4.4", 18, 2),
];

/** Programming modules: every section has a coding task. */
export const CODING_MODULES: ReadonlySet<string> = new Set([
  "b1-1", "b2-1", "b2-2", "b2-3", "b2-4", "b2-5", "b3-1", "b3-2",
]);

export interface TestIO {
  input: string;
  output: string;
}

interface Base {
  id: string;
  /** The PPTX lesson it practises; absent only on the module's exam question. */
  section?: string;
  title: string;
  prompt: string;
  xp: number;
  hint?: string;
}

export type ContentChallenge =
  | (Base & { type: "mcq"; options: string[]; answer: number })
  | (Base & { type: "tracing"; expected: string })
  | (Base & {
      type: "coding";
      starter_code?: string;
      tests: TestIO[];
      hidden_tests: TestIO[];
      /** Reference solution: checked by scripts/check-solutions.ts, never stored. */
      solution: string;
    })
  | (Base & { type: "theory"; mark_scheme: string });

export interface ChallengeFile {
  module_id: string;
  challenges: ContentChallenge[];
}

const ID_RE = /^[a-z0-9-]{3,60}$/;
const text = (v: unknown) => typeof v === "string" && v.trim() !== "";
const tests = (v: unknown) =>
  Array.isArray(v) &&
  v.every((t) => t && typeof t === "object" && typeof t.input === "string" && text(t.output));

export function checkModuleMeta(meta: Record<string, unknown>, mod: IbdpModule): string[] {
  const problems: string[] = [];
  if (meta.module_id !== mod.id) problems.push(`module_id must be ${mod.id}`);
  if (meta.syllabus_ref !== mod.ref) problems.push(`syllabus_ref must be ${mod.ref}`);
  if (meta.order !== mod.order) problems.push(`order must be ${mod.order}`);
  if (typeof meta.title !== "string" || !meta.title.startsWith(`${mod.ref} `)) {
    problems.push(`title must start with "${mod.ref} "`);
  }
  if (typeof meta.description !== "string" || meta.description.trim().length < 30) {
    problems.push("description must be a full sentence (≥ 30 characters)");
  }
  return problems;
}

const PARTS = ["🎯", "🤔", "📖", "⚠️", "📝", "✅"] as const;

/** Every section as `## <ref> …`, in order, with the template's parts; ends with Дүгнэлт. */
export function checkLessonStructure(lesson: string, mod: IbdpModule): string[] {
  const problems: string[] = [];
  const headings = [...lesson.matchAll(/^## (\S+) /gm)].map((h) => ({ ref: h[1], at: h.index ?? 0 }));
  let last = -1;
  for (const ref of mod.sections) {
    const i = headings.findIndex((h) => h.ref === ref);
    if (i === -1) {
      problems.push(`${ref}: missing "## ${ref} …" heading`);
      continue;
    }
    if (i < last) problems.push(`${ref}: section out of order`);
    last = i;
    const end = headings[i + 1]?.at ?? lesson.length;
    const block = lesson.slice(headings[i].at, end);
    for (const part of PARTS) {
      if (!block.includes(part)) problems.push(`${ref}: missing ${part} part`);
    }
  }
  if (!/^## Дүгнэлт/m.test(lesson)) problems.push("missing ## Дүгнэлт");
  return problems;
}

export function checkChallengeFile(raw: unknown, mod: IbdpModule): string[] {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as ChallengeFile).challenges)) {
    return ["not a challenge file"];
  }
  const file = raw as ChallengeFile;
  const problems: string[] = [];
  if (file.module_id !== mod.id) problems.push(`module_id must be ${mod.id}`);

  const seen = new Set<string>();
  const perSection = new Map<string, ContentChallenge[]>();
  let theory = 0;
  for (const c of file.challenges) {
    const id = String(c?.id);
    const say = (p: string) => problems.push(`${id}: ${p}`);
    if (seen.has(id)) problems.push(`duplicate id ${id}`);
    seen.add(id);
    if (!ID_RE.test(id)) say("id must be lowercase letters, digits and dashes");
    if (!id.startsWith(`${mod.id}-`)) say(`id must start with ${mod.id}-`);
    if (!text(c.title)) say("title is empty");
    if (!text(c.prompt)) say("prompt is empty");
    if (!Number.isInteger(c.xp) || c.xp <= 0) say("xp must be a positive integer");

    if (c.type === "theory") {
      theory++;
      if (c.section !== undefined) say("the exam question has no section");
      if (!text(c.mark_scheme)) say("mark_scheme is empty");
      continue;
    }
    if (typeof c.section !== "string" || !mod.sections.includes(c.section)) {
      problems.push(`${id}: unknown section ${c.section}`);
    } else {
      perSection.set(c.section, [...(perSection.get(c.section) ?? []), c]);
    }
    switch (c.type) {
      case "mcq":
        if (!Array.isArray(c.options) || c.options.length < 2 || !c.options.every(text)) {
          say("options must be ≥ 2 non-empty strings");
        } else if (!Number.isInteger(c.answer) || c.answer < 0 || c.answer >= c.options.length) {
          say(`answer ${c.answer} is not an option index`);
        }
        break;
      case "tracing":
        if (!text(c.expected)) say("expected is empty");
        break;
      case "coding":
        if (!tests(c.tests) || c.tests.length < 2) say("needs ≥ 2 tests");
        if (!tests(c.hidden_tests) || c.hidden_tests.length < 3) say("needs ≥ 3 hidden_tests");
        if (!text(c.solution)) say("solution is empty");
        if (!text(c.hint)) say("coding needs a hint");
        break;
      default:
        say(`unknown type ${(c as { type?: unknown }).type}`);
    }
  }
  if (theory !== 1) problems.push(`needs exactly 1 theory (exam) challenge, has ${theory}`);
  for (const ref of mod.sections) {
    const list = perSection.get(ref) ?? [];
    if (list.length < 2) problems.push(`section ${ref} has ${list.length} challenge(s), needs ≥ 2`);
    if (CODING_MODULES.has(mod.id) && !list.some((c) => c.type === "coding")) {
      problems.push(`section ${ref} needs a coding challenge`);
    }
  }
  return problems;
}

const io = (t: TestIO) => ({ input: t.input, expected_output: t.output });

/** Database rows in file order; the reference solution is dropped here. */
export function challengeRows(file: ChallengeFile): { challenge: Challenge; priv: ChallengePrivate }[] {
  return file.challenges.map((c, i) => {
    const challenge: Challenge = {
      id: c.id,
      module_id: file.module_id,
      type: c.type,
      title: c.title,
      prompt: c.prompt,
      xp_reward: c.xp,
      order: i + 1,
      has_hint: !!c.hint,
    };
    const priv: ChallengePrivate = c.hint ? { hint: c.hint } : {};
    switch (c.type) {
      case "mcq":
        challenge.options = c.options;
        priv.correct_answer_index = c.answer;
        break;
      case "tracing":
        priv.expected_answer = c.expected;
        break;
      case "coding":
        challenge.language = "python";
        if (c.starter_code) challenge.starter_code = c.starter_code;
        challenge.public_test_cases = c.tests.map(io);
        priv.hidden_test_cases = c.hidden_tests.map(io);
        break;
      case "theory":
        priv.mark_scheme = c.mark_scheme;
        break;
    }
    return { challenge, priv };
  });
}

/** The ```python blocks of a markdown prompt, trimmed. */
export function pythonBlocks(markdown: string): string[] {
  return [...markdown.matchAll(/```python\n([\s\S]*?)```/g)].map((b) => b[1].trim());
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/content/ibdp.test.ts`
Expected: PASS, 8/8.

- [ ] **Step 5: Add the `<HL />` badge.** In `src/components/mdx/mdx-content.tsx`, add above `const components`:

```tsx
/** "HL" label after an HL-only section title: `## A1.3.5 … <HL />` */
function HL() {
  return (
    <span className="not-prose ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 align-middle text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
      HL
    </span>
  );
}
```

and add `HL,` to the `components` object.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no output.

---

### Task 2: Loader, content test, module-03 label

**Files:**
- Create: `src/lib/content/ibdp-files.ts`, `src/lib/content/ibdp-content.test.ts`
- Modify: `content/modules/module-03.mdx` (`syllabus_ref: "B1.1"` → `"B2.1"`)

**Interfaces:**
- Consumes: from Task 1, `IBDP_MODULES`, the checkers and `IbdpModule`; `mdxError` from `@/lib/mdx-check`.
- Produces: `LoadedModule { module: IbdpModule; meta: Record<string, unknown>; lesson: string; challenges: unknown }` and `loadIbdpContent(root?: string): LoadedModule[]`, which returns only the modules whose `.mdx` exists (content arrives in batches).

- [ ] **Step 1: Write the loader.** Create `src/lib/content/ibdp-files.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { IBDP_MODULES, type IbdpModule } from "@/lib/content/ibdp";

export interface LoadedModule {
  module: IbdpModule;
  meta: Record<string, unknown>;
  lesson: string;
  /** Parsed content/challenges/<id>.json, or null when missing. */
  challenges: unknown;
}

/** The IB DP modules whose lesson file exists — content arrives in batches. */
export function loadIbdpContent(root = process.cwd()): LoadedModule[] {
  return IBDP_MODULES.flatMap((module) => {
    const mdx = join(root, "content", "modules", `${module.id}.mdx`);
    if (!existsSync(mdx)) return [];
    const { data, content } = matter(readFileSync(mdx, "utf8"));
    const json = join(root, "content", "challenges", `${module.id}.json`);
    const challenges: unknown = existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : null;
    return [{ module, meta: data, lesson: content.trim(), challenges }];
  });
}
```

- [ ] **Step 2: Write the content test.** Create `src/lib/content/ibdp-content.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it.** No content exists yet, so it passes vacuously.

Run: `npx tsx --conditions=react-server --test src/lib/content/ibdp-content.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 4: Relabel module-03.** In `content/modules/module-03.mdx` change `syllabus_ref: "B1.1"` to `syllabus_ref: "B2.1"`.

---

### Task 3: Importer, script, `db:seed`

**Files:**
- Create: `src/lib/content/ibdp-import.ts`, `src/lib/content/ibdp-import.test.ts`, `scripts/import-ibdp.ts`
- Modify: `package.json` (`db:seed` gains `&& npm run script -- scripts/import-ibdp.ts`)

**Interfaces:**
- Consumes:
  - From Task 1: `checkModuleMeta`, `checkLessonStructure`, `checkChallengeFile`, `challengeRows` and `ChallengeFile`.
  - From Task 2: `LoadedModule` and `loadIbdpContent`.
  - `upsertModule`, `upsertChallenge`, `getDb`, and `modules`, `challenges` from the schema.
- Produces: `importIbdp(loaded: LoadedModule[]): Promise<{ modules: number; challenges: number; stale: string[] }>`. It throws, having written nothing, when any file has problems.

- [ ] **Step 1: Write the failing test** `src/lib/content/ibdp-import.test.ts`:

```ts
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
  await assert.rejects(importIbdp([bad]), /exactly 1 theory/);
  assert.equal((await getDb().select().from(modules)).length, 0);
});

test("importIbdp reports challenges in the database that the file no longer has", async () => {
  await importIbdp([a44()]);
  await addChallenge("a4-4-old", "a4-4");
  const r = await importIbdp([a44()]);
  assert.deepEqual(r.stale, ["a4-4-old"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --env-file=.env.local --conditions=react-server --test src/lib/content/ibdp-import.test.ts`
Expected: FAIL with `Cannot find module '@/lib/content/ibdp-import'`.

- [ ] **Step 3: Implement** `src/lib/content/ibdp-import.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --env-file=.env.local --conditions=react-server --test src/lib/content/ibdp-import.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Write the script** `scripts/import-ibdp.ts`:

```ts
/**
 * Imports the IB DP modules (content/modules/<id>.mdx + content/challenges/<id>.json)
 * — only those 19, never modules 01–07. Safe to re-run.
 * Local:      npm run script -- scripts/import-ibdp.ts
 * Production: npm.cmd run script:prod -- scripts/import-ibdp.ts   (after deploying)
 */
import { closeDb } from "../src/lib/db/client";
import { loadIbdpContent } from "../src/lib/content/ibdp-files";
import { importIbdp } from "../src/lib/content/ibdp-import";

async function main() {
  const loaded = loadIbdpContent();
  const r = await importIbdp(loaded);
  console.log(`imported ${r.modules} modules, ${r.challenges} challenges: ${loaded.map((m) => m.module.id).join(", ")}`);
  if (r.stale.length > 0) {
    console.warn(`challenges in the database but not in the files (left as they are): ${r.stale.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 6: Wire `db:seed`.** In `package.json`, append ` && npm run script -- scripts/import-ibdp.ts` to the `db:seed` command. Spec §5 names a separate `seed-ibdp.ts` for local use. One script serves both, because the behaviour is identical. `import-content.ts`, which `db:seed` runs first, also picks up the new `.mdx` files with the same values, which is harmless. In production, run **only** `import-ibdp.ts`.

- [ ] **Step 7: Run the script with no content yet**

Run: `npm run script -- scripts/import-ibdp.ts`
Expected: `imported 0 modules, 0 challenges: `.

---

### Task 4: `check-solutions` script

**Files:**
- Create: `scripts/check-solutions.ts`

**Interfaces:**
- Consumes:
  - From Task 1: `checkChallengeFile`, `pythonBlocks` and `ChallengeFile`.
  - From Task 2: `loadIbdpContent`.
  - `gradePython`, `executePython` and `normalizeOutput` from `@/lib/piston`.
- Produces: the CLI `npm run script -- scripts/check-solutions.ts [module-id …]`. It prints `checked N challenges, M problems` and exits 1 if M > 0.

- [ ] **Step 1: Write the script**

```ts
/**
 * Proves IB DP answers on the real grader (Piston, PISTON_URL):
 * - coding: the reference `solution` must pass every public and hidden test;
 * - tracing: the prompt's ```python block must print exactly `expected`.
 * Run: npm run script -- scripts/check-solutions.ts [module-id …]
 */
import { checkChallengeFile, pythonBlocks, type ChallengeFile } from "../src/lib/content/ibdp";
import { loadIbdpContent } from "../src/lib/content/ibdp-files";
import { executePython, gradePython, normalizeOutput } from "../src/lib/piston";

async function main() {
  const only = new Set(process.argv.slice(2));
  const problems: string[] = [];
  let checked = 0;

  for (const m of loadIbdpContent()) {
    if (only.size > 0 && !only.has(m.module.id)) continue;
    const fileProblems = checkChallengeFile(m.challenges, m.module);
    if (fileProblems.length > 0) {
      problems.push(...fileProblems.map((p) => `${m.module.id}: ${p}`));
      continue;
    }
    for (const c of (m.challenges as ChallengeFile).challenges) {
      if (c.type === "coding") {
        const cases = [...c.tests, ...c.hidden_tests].map((t) => ({ input: t.input, expected_output: t.output }));
        const results = await gradePython(c.solution, cases);
        results.forEach((r, i) => {
          if (!r.passed) {
            problems.push(`${c.id} test ${i + 1}: expected ${JSON.stringify(normalizeOutput(cases[i].expected_output))}, got ${JSON.stringify(r.actual)}`);
          }
        });
        checked++;
      } else if (c.type === "tracing") {
        const [code] = pythonBlocks(c.prompt);
        if (!code) continue; // a tracing question without a program
        const run = await executePython(code, "");
        const want = normalizeOutput(c.expected);
        if (run.error !== null || run.output !== want) {
          problems.push(`${c.id}: expected ${JSON.stringify(want)}, got ${JSON.stringify(run.error ?? run.output)}`);
        }
        checked++;
      }
    }
  }

  console.log(`checked ${checked} challenges, ${problems.length} problems`);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  }
}

main();
```

- [ ] **Step 2: Run it with no content**

Run: `npm run script -- scripts/check-solutions.ts`
Expected: `checked 0 challenges, 0 problems`.

- [ ] **Step 3: Full suite, typecheck, lint**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)" && npx tsc --noEmit -p . && npm run lint 2>&1 | grep problems`
Expected: all pass. That is 224 + 8 (Task 1) + 3 (Task 2) + 4 (Task 3) = 239. tsc silent; lint shows the 2 known warnings only.

---

### Task 5: PPTX extraction tool (workspace, not the repo)

**Files:**
- Create: `.superpowers/sdd/2026-10-01-ibdp-lessons/extract_pptx.py`

- [ ] **Step 1: Write the tool**

```python
"""Dump every PPTX in a folder to Markdown text (slides + speaker notes).

usage: python extract_pptx.py <pptx folder> <out folder>
"""
import html
import os
import re
import sys
import zipfile

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)


def texts(xml: str) -> list[str]:
    # Paragraph by paragraph, so bullet points stay separate lines.
    paras = re.findall(r"<a:p>(.*?)</a:p>", xml, flags=re.S)
    lines = []
    for p in paras:
        t = "".join(html.unescape(x) for x in re.findall(r"<a:t>([^<]*)</a:t>", p)).strip()
        if t:
            lines.append(t)
    return lines


def num(name: str) -> int:
    return int(re.findall(r"(\d+)\.xml$", name)[0])


for fname in sorted(os.listdir(src)):
    if not fname.endswith(".pptx"):
        continue
    z = zipfile.ZipFile(os.path.join(src, fname))
    names = z.namelist()
    slides = sorted((n for n in names if re.match(r"ppt/slides/slide\d+\.xml$", n)), key=num)
    notes = {num(n): n for n in names if re.match(r"ppt/notesSlides/notesSlide\d+\.xml$", n)}
    lines = [f"# {fname}", ""]
    for s in slides:
        k = num(s)
        lines.append(f"## Slide {k}")
        lines += texts(z.read(s).decode("utf8"))
        if k in notes:
            note = [t for t in texts(z.read(notes[k]).decode("utf8")) if not t.isdigit()]
            if note:
                lines.append("Notes: " + " / ".join(note))
        lines.append("")
    with open(os.path.join(out, fname[:-5] + ".md"), "w", encoding="utf8") as f:
        f.write("\n".join(lines))
    print("wrote", fname)
```

Note: speaker-note numbering may not follow slide numbering in every deck. If notes look misplaced, read them as a whole rather than per slide.

- [ ] **Step 2: Try it on B2.2**

Run: `PYTHONIOENCODING=utf-8 python .superpowers/sdd/2026-10-01-ibdp-lessons/extract_pptx.py "D:/2026-2027 lessons/IBDP-CS/B2.2 lessons" .superpowers/sdd/2026-10-01-ibdp-lessons/source/b2-2`
Expected: 4 `wrote …` lines. `source/b2-2/B2.2.3_Stacks.md` has 18 `## Slide` headings.

---

## Module tasks (6–24)

Every module task has the same steps. `<id>`, `<Folder>` and the frontmatter come from the task's table. `WS=.superpowers/sdd/2026-10-01-ibdp-lessons`.

1. **Extract:** `PYTHONIOENCODING=utf-8 python $WS/extract_pptx.py "D:/2026-2027 lessons/IBDP-CS/<Folder>" $WS/source/<id>`. Then read every extracted `.md` and every `.py` in `<Folder>` completely.
2. **Lesson:** write `content/modules/<id>.mdx`. It starts with the task's exact frontmatter, then follows the Global Constraints template. There is one section per listed lesson, in order, and HL ones get ` <HL />`.
3. **Challenges:** write `content/challenges/<id>.json` per the Global Constraints: 2 per section (programming modules: one of them `coding`) plus 1 `theory`. Follow the task's "Challenge focus".
4. **Validate content:** `npx tsx --conditions=react-server --test src/lib/content/ibdp-content.test.ts`. Expected: PASS 3/3. On failure, fix the content, never the checker.
5. **Prove answers:** `npm run script -- scripts/check-solutions.ts <id>`. Expected: `checked N challenges, 0 problems`, where N is the number of coding plus code-tracing challenges.
6. **Import locally:** `npm run script -- scripts/import-ibdp.ts`. Expected: `imported K modules, …` including `<id>`, with no stale warning.
7. **Browser:** with the admin session on `localhost:3001`:
   - Open `/modules/<id>`. There is no `role="alert"` box, every `## <ref>` heading is visible, HL badges appear, and `<details>` open and close.
   - Open one challenge of each type in the module and submit a correct answer once for mcq/tracing (admin attempts don't affect students).
   - Read the console for errors.

Each batch ends with a **user checkpoint**: report which modules were added (sections, number of challenges per type, anything notable), give the local URLs, and **wait for the user's go-ahead** before the next batch (spec §6, success criterion 6).

### Batch 1 (pilot)

### Task 6: `a1-3` — A1.3 lessons

```yaml
---
module_id: "a1-3"
syllabus_ref: "A1.3"
title: "A1.3 Үйлдлийн систем ба удирдлагын систем"
order: 8
description: "Үйлдлийн систем компьютерийн нөөцийг хэрхэн удирдаж, процессуудыг хуваарилж, тасалдлыг (interrupt) боловсруулдгийг, мөн удирдлагын систем бодит ертөнцөд хэрхэн ажилладгийг судална."
---
```

- **Sections:**
  - A1.3.1 Role_of_OS
  - A1.3.2 Functions_of_OS
  - A1.3.3 Scheduling
  - A1.3.4 Interrupts_and_Polling
  - A1.3.5 Multitasking_and_Resources (HL)
  - A1.3.6 Control_System_Components (HL)
  - A1.3.7 Real_World_Control_Systems (HL)
- **Demos:** `race_condition_demo.py` (A1.3.5), `polling_vs_interrupts.py` (A1.3.4), `traffic_light.py` and `motor_control.py` (A1.3.6/7).
- **Challenge focus:**
  - mcq on OS roles/functions.
  - A1.3.3: a tracing of a round-robin simulation (quantum → finishing order).
  - A1.3.4: polling vs interrupt mcq.
  - A1.3.5: a race-condition tracing (deterministic simulated interleaving, no threads).
  - A1.3.6: a feedback-loop tracing.
  - Exam: "Explain how an interrupt is handled by the processor [4]".

### Task 7: `b1-1` — B1.1 lessons (programming module)

```yaml
---
module_id: "b1-1"
syllabus_ref: "B1.1"
title: "B1.1 Тооцооллын сэтгэлгээ"
order: 8
description: "Бодлогыг тодорхойлох, задлах, хэв маяг олох, хийсвэрлэх, алгоритм зохиож flowchart-аар дүрслэх аргуудыг эзэмшинэ."
---
```

- **Sections:**
  - B1.1.1 Problem_Specification
  - B1.1.2 CT_Concepts
  - B1.1.3 Applying_CT
  - B1.1.4 Flowcharts
- **Demos:** `sum_two_numbers.py`, `usernames.py`, `pattern_recognition.py`, `average_order_bug.py`, `flowchart_traces.py`.
- **Challenge focus:**
  - Each section gets a coding task:
    - input/output spec → program;
    - decomposition of a username generator;
    - pattern → loop;
    - flowchart → code.
  - Plus an mcq or tracing, e.g. find the bug in the average-order program.
  - Exam: "Describe decomposition and abstraction using an example [4]".

→ **Batch 1 checkpoint.** The user reviews style, depth and language. Record their feedback in the ledger as rulings that later batches follow.

### Batch 2

### Task 8: `a1-4` — A1.4 lessons (HL)

```yaml
---
module_id: "a1-4"
syllabus_ref: "A1.4"
title: "A1.4 Хөрвүүлэлт: компилятор ба интерпретатор (HL)"
order: 9
description: "Өндөр түвшний кодыг машин ойлгох хэлбэрт хөрвүүлэх компилятор, интерпретатор, JIT, байткодын ялгаа болон давуу, сул талыг харьцуулна."
---
```

- **Sections:** A1.4.1 Translation (HL).
- **Demos:** `translation_lab.py`, `syntax_error_demo.py`.
- **Challenge focus:**
  - mcq on compiler vs interpreter.
  - A tracing: the program output when the error is on line N under interpretation.
  - Exam: "Compare compilers and interpreters [6]".

### Task 9: `b2-1` — B2.1 lessons (programming)

```yaml
---
module_id: "b2-1"
syllabus_ref: "B2.1"
title: "B2.1 Хувьсагч, тэмдэгт мөр, алдаа засах"
order: 9
description: "Хувьсагч ба өгөгдлийн төрөл, тэмдэгт мөрийн хэсэг (substring), exception-ийг барих, программын алдааг олж засах аргуудыг дадлагажуулна."
---
```

- **Sections:**
  - B2.1.1 Variables_Data_Types
  - B2.1.2 Substrings
  - B2.1.3 Exception_Handling
  - B2.1.4 Debugging
- **Demos:** `variables_types.py`, `scope_demo.py`, `string_lab.py`, `exceptions_lab.py`, `debug_me.py`, `trace_programs.py`.
- **Challenge focus:**
  - Coding: type conversion; slicing; `try/except` for bad input; fix a buggy program (given as `starter_code`).
  - Tracings: scope and slicing.
  - Exam: "Explain the difference between syntax, runtime and logic errors [3]".

### Task 10: `a2-1` — A2.1 lessons

```yaml
---
module_id: "a2-1"
syllabus_ref: "A2.1"
title: "A2.1 Сүлжээний үндэс"
order: 10
description: "Сүлжээний төрөл, дижитал дэд бүтэц, сүлжээний төхөөрөмж, протокол ба TCP/IP загварыг жишээ болон Python туршилтаар ойлгоно."
---
```

- **Sections:**
  - A2.1.1 Networks
  - A2.1.2 Digital_Infrastructures
  - A2.1.3 Network_Devices
  - A2.1.4 Protocols
  - A2.1.5 TCP_IP_Model (HL)
- **Demos:** `encapsulation.py`, `latency_edge_vs_cloud.py`, `http_demo.py`, `find_my_mac.py`, `tcp_server.py`/`tcp_client.py`, `udp_demo.py`. Socket demos are «өөрийн компьютер дээр».
- **Challenge focus:**
  - mcq on LAN/WAN/PAN, device roles, TCP vs UDP.
  - A tracing of encapsulation (headers added per layer).
  - An edge-vs-cloud latency calculation tracing.
  - Exam: "Explain the role of each layer of the TCP/IP model when a web page is requested [6]".

### Task 11: `b2-2` — B2.2 lessons (programming)

```yaml
---
module_id: "b2-2"
syllabus_ref: "B2.2"
title: "B2.2 Өгөгдлийн бүтэц: жагсаалт, стек, дараалал"
order: 10
description: "Статик ба динамик бүтэц, нэг ба хоёр хэмжээст жагсаалт, стек (LIFO), дараалал (FIFO)-ыг Python-оор бүтээж ашиглана."
---
```

- **Sections:**
  - B2.2.1 Static_vs_Dynamic
  - B2.2.2 Lists_1D_2D
  - B2.2.3 Stacks
  - B2.2.4 Queues
- **Demos:** `static_vs_dynamic.py`, `lists_1d_2d.py`, `stack.py`, `queue_lab.py`.
- **Challenge focus:**
  - Coding: a fixed-size array with an overflow message; 2D grid row/column sums; a bracket matcher with a stack; a queue simulation with commands from stdin.
  - Tracings: push/pop sequences.
  - Exam: "Explain why a stack is suitable for an undo feature [4]".

→ **Batch 2 checkpoint.**

### Batch 3

### Task 12: `a3-1` — A3.1 lessons

```yaml
---
module_id: "a3-1"
syllabus_ref: "A3.1"
title: "A3.1 Реляцын өгөгдлийн сан"
order: 11
description: "Хүснэгт, мөр, багана, түлхүүр (primary/foreign key) болон хамаарлаар өгөгдлийг хэрхэн зохион байгуулдгийг нисэх онгоцны буудлын жишээгээр судална."
---
```

- **Sections:** A3.1.1 Relational_Databases.
- **Demos:** `airport.py`, `db_helper.py` (sqlite3, in memory).
- **Challenge focus:**
  - mcq on primary vs foreign key.
  - A tracing of a small sqlite3 program printing a join.
  - Exam: "Describe the features of a relational database [4]".

### Task 13: `b2-3` — B2.3 lessons (programming)

```yaml
---
module_id: "b2-3"
syllabus_ref: "B2.3"
title: "B2.3 Программын удирдлагын бүтэц"
order: 11
description: "Дараалал (sequence), сонголт (if), давталт (for/while) ба функцээр программын урсгалыг удирдаж, цэвэр код бичнэ."
---
```

- **Sections:**
  - B2.3.1 Sequencing
  - B2.3.2 Selection
  - B2.3.3 Loops
  - B2.3.4 Functions
- **Demos:** `sequence_lab.py`, `selection_lab.py`, `loops_lab.py`, `functions_lab.py`.
- **Challenge focus:** one coding task per construct (grade boundaries; FizzBuzz-style loop; a function with a return), plus tracings of nested loops and function calls.
- **Exam:** "Explain the benefits of using functions [4]".

### Task 14: `a3-2` — A3.2 lessons

```yaml
---
module_id: "a3-2"
syllabus_ref: "A3.2"
title: "A3.2 Өгөгдлийн сангийн схем ба нормчлол"
order: 12
description: "Схем, ER диаграм, өгөгдлийн төрөл, хүснэгт үүсгэх, 1NF–3NF нормчлол ба денормчлолын сонголтыг жишээгээр эзэмшинэ."
---
```

- **Sections:**
  - A3.2.1 Database_Schemas
  - A3.2.2 ERDs
  - A3.2.3 Data_Types
  - A3.2.4 Constructing_Tables
  - A3.2.5 Normal_Forms
  - A3.2.6 Normalising_to_3NF
  - A3.2.7 Denormalising
- **Demos:** `sales_schema.py`, `data_types.py`, `normalise_books.py`, `denormalise.py`.
- **Challenge focus:**
  - mcq on cardinality, data types and which NF is violated.
  - Tracings of CREATE/INSERT/SELECT runs.
  - Exam: "Normalise the given table to 3NF, showing each step [6]".

### Task 15: `b2-4` — B2.4 lessons (programming)

```yaml
---
module_id: "b2-4"
syllabus_ref: "B2.4"
title: "B2.4 Алгоритм: Big O, хайлт, эрэмбэлэлт, рекурс"
order: 12
description: "Алгоритмын үр ашгийг Big O-оор үнэлж, шугаман ба хоёртын хайлт, эрэмбэлэх алгоритмууд болон рекурсыг (HL) хэрэгжүүлнэ."
---
```

- **Sections:**
  - B2.4.1 Big_O
  - B2.4.2 Searching
  - B2.4.3 Sorting
  - B2.4.4 Recursion (HL)
  - B2.4.5 Recursive_Algorithms (HL)
- **Demos:** `bigo_lab.py`, `search_lab.py`, `sort_lab.py`, `quicksort.py`, `recursion_lab.py`, `recursive_algorithms.py`.
- **Challenge focus:**
  - Coding: count operations; binary search that returns the steps; bubble sort passes; recursive factorial/sum; recursive binary search or quicksort.
  - Tracings of a bubble-sort pass and of recursion.
  - Exam: "Compare linear search and binary search in terms of efficiency [4]".

→ **Batch 3 checkpoint.**

### Batch 4

### Task 16: `a3-3` — A3.3 lessons

```yaml
---
module_id: "a3-3"
syllabus_ref: "A3.3"
title: "A3.3 SQL: өгөгдөл тодорхойлох ба удирдах"
order: 13
description: "DDL ба DML, SELECT query, өгөгдөл шинэчлэх, агрегат функц, view болон ACID транзакцыг (HL) Python-ы sqlite3-аар туршина."
---
```

- **Sections:**
  - A3.3.1 DDL_and_DML
  - A3.3.2 SQL_Queries
  - A3.3.3 Updating_Data
  - A3.3.4 Aggregate_Functions (HL)
  - A3.3.5 Database_Views (HL)
  - A3.3.6 Transactions_ACID (HL)
- **Demos:** `company.py`, `sql_ddl_dml.py`, `sql_queries.py`, `sql_aggregates.py`, `sql_transactions.py`.
- **Challenge focus:**
  - Tracings of query results (sqlite3 in-memory).
  - Optional coding: the student writes the SQL string inside a given sqlite3 harness in `starter_code`; the tests check the printed rows.
  - mcq on ACID properties.
  - Exam: "Explain how the atomicity of a transaction protects a bank transfer [4]".

### Task 17: `b2-5` — B2.5 lessons (programming)

```yaml
---
module_id: "b2-5"
syllabus_ref: "B2.5"
title: "B2.5 Файлтай ажиллах"
order: 13
description: "Текст файл унших, бичих, нэмэх болон мөр мөрөөр боловсруулж өгөгдлийг хадгалах аргуудыг эзэмшинэ."
---
```

- **Sections:** B2.5.1 File_Processing.
- **Demos:** `files_lab.py`.
- **Challenge focus:**
  - Coding: write stdin lines to a file, then read it back and summarise (Piston allows temp files in the working dir).
  - mcq on `r`/`w`/`a` modes.
  - Exam: "Describe the steps to append a record to a text file [3]".

### Task 18: `a3-4` — A3.4 lessons (HL)

```yaml
---
module_id: "a3-4"
syllabus_ref: "A3.4"
title: "A3.4 Өгөгдлийн сангийн төрлүүд (HL)"
order: 14
description: "NoSQL загварууд, өгөгдлийн агуулах (data warehouse), OLAP ба data mining, тархсан өгөгдлийн сангийн онцлогийг харьцуулна."
---
```

- **Sections:**
  - A3.4.1 Types_of_Databases (HL)
  - A3.4.2 Data_Warehouses (HL)
  - A3.4.3 OLAP_and_Data_Mining (HL)
  - A3.4.4 Distributed_Databases (HL)
- **Demos:** `nosql_models.py`, `warehouse_olap.py`, `data_mining.py`, `distributed_sim.py`.
- **Challenge focus:**
  - mcq on choosing a DB model for a scenario.
  - Tracings of the OLAP roll-up and the replication simulation.
  - Exam: "Evaluate the use of a distributed database for a national bank [6]".

### Task 19: `b3-1` — B3.1 lessons (programming)

```yaml
---
module_id: "b3-1"
syllabus_ref: "B3.1"
title: "B3.1 Объект хандалтат программчлал"
order: 14
description: "Класс ба объект, UML класс диаграм, static ба instance гишүүн, encapsulation-ийг банкны данс мэт жишээгээр бүтээнэ."
---
```

- **Sections:**
  - B3.1.1 Fundamentals_of_OOP
  - B3.1.2 UML_Class_Design
  - B3.1.3 Static_vs_Non_Static
  - B3.1.4 Classes_and_Objects
  - B3.1.5 Encapsulation
- **Demos:** `oop_intro.py`, `library_uml.py`, `static_lab.py`, `bank_account.py`, `encapsulation_lab.py`.
- **Challenge focus:**
  - Coding: build a class from a UML box; an instance counter with a class attribute; a BankAccount with a guarded withdraw, driven by commands from stdin.
  - Tracings of object state.
  - Exam: "Explain the benefits of encapsulation [4]".

→ **Batch 4 checkpoint.**

### Batch 5

### Task 20: `a4-1` — A4.1 lessons

```yaml
---
module_id: "a4-1"
syllabus_ref: "A4.1"
title: "A4.1 Машин сургалтын үндэс"
order: 15
description: "Хяналттай, хяналтгүй, бататгах сургалтын ялгаа болон машин сургалтад шаардлагатай тоног төхөөрөмжийг танина."
---
```

- **Sections:**
  - A4.1.1 Types_of_Machine_Learning
  - A4.1.2 Hardware_for_ML
- **Demos:** none. Use tables and small pure-Python illustrations.
- **Challenge focus:**
  - mcq matching scenarios to ML types and to hardware (CPU/GPU/TPU/edge).
  - Exam: "Distinguish between supervised and unsupervised learning [4]".

### Task 21: `b3-2` — B3.2 lessons (HL, programming)

```yaml
---
module_id: "b3-2"
syllabus_ref: "B3.2"
title: "B3.2 OOP II: удамшил, полиморфизм, загвар (HL)"
order: 15
description: "Удамшил, полиморфизм, хийсвэрлэл, composition ба aggregation, түгээмэл design pattern-уудыг Python-оор хэрэгжүүлнэ."
---
```

- **Sections:**
  - B3.2.1 Inheritance (HL)
  - B3.2.2 Polymorphism (HL)
  - B3.2.3 Abstraction (HL)
  - B3.2.4 Composition_Aggregation (HL)
  - B3.2.5 Design_Patterns (HL)
- **Demos:** `inheritance_lab.py`, `polymorphism_lab.py`, `shapes_abc.py`, `composition_lab.py`, `patterns_lab.py`.
- **Challenge focus:**
  - Coding: a subclass overriding a method; a polymorphic `area()` over shapes read from stdin; an ABC; composition (a Car with an Engine); a singleton or observer.
  - Tracings of method resolution.
  - Exam: "Explain polymorphism with an example [4]".

### Task 22: `a4-2` — A4.2 lessons (HL)

```yaml
---
module_id: "a4-2"
syllabus_ref: "A4.2"
title: "A4.2 Өгөгдөл бэлтгэх (HL)"
order: 16
description: "Өгөгдөл цэвэрлэх, шинж чанар (feature) сонгох, хэмжээс бууруулах аргуудаар машин сургалтын өгөгдлийг бэлтгэнэ."
---
```

- **Sections:**
  - A4.2.1 Data_Cleaning (HL)
  - A4.2.2 Feature_Selection (HL)
  - A4.2.3 Dimensionality_Reduction (HL)
- **Demos:** `clean_data.py`, `feature_select.py`, `curse_dim.py` (pure Python only; pandas/numpy aren't guaranteed on Piston, so the tracings use plain Python).
- **Challenge focus:**
  - Tracings of cleaning steps (duplicates, missing values, outliers).
  - mcq on filter/wrapper/embedded selection and the curse of dimensionality.
  - Exam: "Explain why data cleaning is needed before training [4]".

→ **Batch 5 checkpoint.**

### Batch 6

### Task 23: `a4-3` — A4.3 lessons (HL)

```yaml
---
module_id: "a4-3"
syllabus_ref: "A4.3"
title: "A4.3 Машин сургалтын аргууд (HL)"
order: 17
description: "Регресс, ангилал, кластер, association rule, reinforcement learning, genetic algorithm, neural network ба CNN-ийн ажиллах зарчим болон үнэлгээг судална."
---
```

- **Sections** (all HL):
  - A4.3.1 Linear_Regression
  - A4.3.2 Classification
  - A4.3.3 Evaluation_and_Tuning
  - A4.3.4 Clustering
  - A4.3.5 Association_Rules
  - A4.3.6 Reinforcement_Learning
  - A4.3.7 Genetic_Algorithms
  - A4.3.8 Neural_Networks
  - A4.3.9 CNNs
  - A4.3.10 Model_Selection
- **Note:** the PPTX file `A4.3.10_…` sorts before `A4.3.1_…`, but the lesson order is numeric.
- **Demos:** `association_rules.py`, `convolution.py`, plus small pure-Python ones.
- **Challenge focus:**
  - Tracings: a least-squares line on 3 points, precision/recall from a confusion matrix, one k-means assignment step, support/confidence, one Q-learning update, crossover/mutation, a perceptron output, a 3×3 convolution.
  - mcq on choosing a model.
  - Exam: "Explain how a convolutional neural network recognises features in an image [6]".

### Task 24: `a4-4` — A4.4 lessons

```yaml
---
module_id: "a4-4"
syllabus_ref: "A4.4"
title: "A4.4 Машин сургалтын ёс зүй"
order: 18
description: "Машин сургалт ба шинэ технологийн хэвийсэл (bias), нууцлал, хариуцлага, нийгэмд үзүүлэх нөлөөг IB-ийн жишээгээр хэлэлцэнэ."
---
```

- **Sections:**
  - A4.4.1 Ethics_of_ML
  - A4.4.2 Ethics_and_Emerging_Tech
- **Demos:** none.
- **Challenge focus:**
  - mcq scenarios: bias sources, privacy, accountability, deepfakes.
  - One tracing of a tiny fairness-metric calculation.
  - Exam: "Discuss the ethical implications of facial recognition in public spaces [6]".

→ **Batch 6 checkpoint.**

### Task 25: Completion

**Files:**
- Modify: `src/lib/content/ibdp-content.test.ts` (add the all-modules test)
- Modify: `README.md`

- [ ] **Step 1: Pin completeness.** Append to `src/lib/content/ibdp-content.test.ts`:

```ts
test("all 19 IB DP modules are present with their challenges", () => {
  assert.equal(loaded.length, 19);
  assert.ok(loaded.every((m) => m.challenges !== null));
});
```

Run it. Expected: PASS once all batches are done.

- [ ] **Step 2: README.** Under «Контент нэмэх», add:

```markdown
- **IB DP хичээлүүд** (`a1-3` … `b3-2`, 19 модуль): `content/modules/<id>.mdx` + `content/challenges/<id>.json`. Шалгах: `npm test` (загвар, MDX, даалгаврын бүрэн байдал), `npm run script -- scripts/check-solutions.ts [id]` (coding/tracing хариуг Piston дээр). Оруулах: `npm run script -- scripts/import-ibdp.ts` (зөвхөн эдгээр модуль; 01–07-д хүрэхгүй). Production: эхлээд deploy, дараа нь `npm.cmd run script:prod -- scripts/import-ibdp.ts`. Даалгаврын ID-г оруулсны дараа бүү өөрчил.
```

- [ ] **Step 3: Full verification**

Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"; npm run script -- scripts/check-solutions.ts; npx tsc --noEmit -p .; npm run lint 2>&1 | grep problems; npm run build 2>&1 | grep -E "Compiled|rror"`
Expected:
- tests: all pass;
- check-solutions: `0 problems`;
- tsc: silent;
- lint: the 2 known warnings;
- build: `✓ Compiled successfully`.
