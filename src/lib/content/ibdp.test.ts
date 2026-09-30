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

test("checkLessonStructure: conclusion block is checked for parts, not conclusion text", () => {
  // A4.4.2 block lacks ✅, but the Дүгнэлт section contains ✅
  const badSectionGoodConclusion = `Танилцуулга\n\n${SECTION("A4.4.1")}\n## A4.4.2 Гарчиг\n\n> 🎯 **Зорилго:** x\n\n### 🤔 Бодоод үзээрэй\n\nx\n\n### 📖 Гол ойлголт\n\nx\n\n<Callout type="warning">\n**⚠️ Анхаарах зүйлс**\n</Callout>\n\n### 📝 Түлхүүр нэр томьёо\n\nx\n\n## Дүгнэлт\n\n✅ Боломжтой\n`;
  const problems = checkLessonStructure(badSectionGoodConclusion, A44);
  assert.ok(problems.some((p) => p.includes("A4.4.2") && p.includes("✅")), problems.join("\n"));
});

test("checkLessonStructure: Дүгнэлт must be the last heading", () => {
  // ## Дүгнэлт placed before the sections
  const conclusionFirst = `## Дүгнэлт\n\nx\n\n${SECTION("A4.4.1")}\n${SECTION("A4.4.2")}\n`;
  const problems = checkLessonStructure(conclusionFirst, A44);
  assert.ok(problems.some((p) => p.includes("must be the last")), problems.join("\n"));
});

test("checkLessonStructure: headings inside code blocks are not section boundaries", () => {
  // A4.4.1 contains a ```python block with a line "## not a heading"
  const withCodeBlock = `Танилцуулга\n\n## A4.4.1 Гарчиг\n\n> 🎯 **Зорилго:** x\n\n### 🤔 Бодоод үзээрэй\n\nx\n\n### 📖 Гол ойлголт\n\n\`\`\`python\n## not a heading\nprint("hello")\n\`\`\`\n\n<Callout type="warning">\n**⚠️ Анхаарах зүйлс**\n</Callout>\n\n### 📝 Түлхүүр нэр томьёо\n\nx\n\n### ✅ Өөрийгөө шалга\n\nx\n\n${SECTION("A4.4.2")}\n## Дүгнэлт\n\nx`;
  assert.deepEqual(checkLessonStructure(withCodeBlock, A44), []);
});

test("pythonBlocks pulls fenced python code out of a prompt", () => {
  assert.deepEqual(pythonBlocks("Юу хэвлэх вэ?\n\n```python\nx = 1\nprint(x)\n```\n\n```text\nno\n```"), ["x = 1\nprint(x)"]);
  assert.deepEqual(pythonBlocks("no code"), []);
});
