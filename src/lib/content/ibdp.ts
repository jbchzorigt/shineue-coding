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

  // Blank out fenced code blocks (``` … ```) to avoid matching headings inside them
  const blanked = lesson.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split('\n');
    return lines.map((line) => ' '.repeat(line.length)).join('\n');
  });

  // Extract all headings (any line starting with "## ")
  const headings = [...blanked.matchAll(/^## (\S+)/gm)].map((h) => ({ ref: h[1], at: h.index ?? 0 }));

  // Check that Дүгнэлт is the last heading
  if (headings.length > 0 && headings[headings.length - 1].ref !== "Дүгнэлт") {
    problems.push("## Дүгнэлт must be the last ## heading");
  } else if (headings.length === 0) {
    problems.push("## Дүгнэлт must be the last ## heading");
  }

  let last = -1;
  for (const ref of mod.sections) {
    const i = headings.findIndex((h) => h.ref === ref);
    if (i === -1) {
      problems.push(`${ref}: missing "## ${ref} …" heading`);
      continue;
    }
    if (i < last) problems.push(`${ref}: section out of order`);
    last = i;
    const end = headings[i + 1]?.at ?? blanked.length;
    const block = lesson.slice(headings[i].at, end);
    for (const part of PARTS) {
      if (!block.includes(part)) problems.push(`${ref}: missing ${part} part`);
    }
  }
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
