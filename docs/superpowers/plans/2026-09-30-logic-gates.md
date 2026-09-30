# Логик хаалганы (Gate) бодлого: хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Python-ы кодын бодлоготой адил, сурагч логик хаалгаар хэлхээ зурж боддог шинэ бодлогын төрөл (`logic`) нэмэх. Энэ төрөл модуль болон тэмцээнд ажиллах ба багш үүсгэж, засаж чадна.

**Architecture:**
- `src/lib/logic/` нь цэвэр TypeScript модуль (React, DB хамааралгүй). Хаалга, spec шалгалт, хэлхээ задлах/үнэлэх, илэрхийллийн parser, React Flow-той хөрвүүлэх функцуудыг агуулна. Хөтөч болон сервер хоёулаа ашиглана.
- Сервер нь `gradeLogic`-оор хэлхээг дахин үнэлж, хүлээгдэж буй хүснэгттэй (`challenge_answers.expected_table`) харьцуулна.
- Editor нь `@xyflow/react` (React Flow v12) дээр бүтээгдэнэ. Хаалга нь IB-ийн (ANSI) SVG дүрстэй. Шууд симуляцийг `evaluateRow` хийнэ.

**Tech Stack:** Next.js 16.2.10, React 19.2, `@xyflow/react` 12.12, Drizzle 0.45 + Postgres 17, `node:test` + tsx, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-29-logic-gates-design.md`

## Global Constraints

- **Commit ба push ХИЙХГҮЙ.** Хэрэглэгч "final code" гэж хэлэхэд л commit хийнэ. Task бүр "Checkpoint" алхмаар төгсөнө.
- Шинэ dependency зөвхөн `@xyflow/react` (MIT). Өөр package нэмэхгүй.
- Хаалгууд: `AND, OR, NOT, NAND, NOR, XOR, XNOR`. NOT нэг оролттой, бусад нь хоёр оролттой.
- Оролт, гаралтын нэр нь `/^[A-Z]$/`. Оролт 1–4, гаралт 1–4. Нэрс хоорондоо давхцахгүй.
- Хаалга ≤ 60 (`MAX_GATES`), утас ≤ 200, хэлхээний JSON ≤ 20000 тэмдэгт, координат |v| ≤ 100000.
- Үнэний хүснэгтийн мөрүүд хоёртын тооллоор дараалж, `inputs[0]` нь хамгийн ахлах бит. Мөр бүр гаралтын дарааллаар `"0"/"1"` тэмдэгттэй.
- Хүлээгдэж буй хүснэгт зөвхөн `table_visible === true` үед хөтөч рүү очно.
- Хэрэглэгчид харагдах бүх мессеж монголоор бичигдэнэ.
- Next-тэй холбоотой код бичихээс өмнө `node_modules/next/dist/docs/`-ийн холбогдох хэсгийг уншина (`AGENTS.md`).
- Bash командууд Git Bash дээр `D:\2026-2027 lessons\shine ue coding` хавтаснаас ажиллана. `coding-db` болон `coding-piston` ажиллаж байх ёстой (`npm run db:up`). `shineue-db` (5432) контейнерт хүрэхгүй.
- Session cookie, нууц үгийг чат руу бичихгүй.

## Review Focus

1. **Багш бодлогыг засаж оролт/гаралт хассан эсвэл хаалгыг хориглосны дараа сурагчийн хуучин snapshot ачаалагдах.**
   - Editor унахгүй. Байхгүй терминал руу чиглэсэн утаснууд хасагдана.
   - Хориглосон хаалга харагдсаар байж, "Ажиллуулах" дарахад алдаа өгнө.
   - Шалгах тест: Task 4, "circuitToFlow drops wires to terminals the spec no longer has…".
2. **Хүснэгт нуугдсан бодлогын хүлээгдэж буй хүснэгт HTML/RSC payload-д орох.** Хэзээ ч орох ёсгүй. Шалгалт: Task 10, алхам 5.
3. **Утасны өргөн (≤ 1023px) дээр React Flow-ийн эх элемент 0 өндөртэй болох.** Canvas харагдахгүй болно. Шалгалт: Task 10, алхам 9. Editor-ын хайрцаг `max-lg:h-[28rem]` тогтмол өндөртэй (Task 7).
4. **Гараар бэлдсэн хүсэлт:**
   - буруу JSON, 61 хаалга, үл мэдэгдэх терминал, NOT-ийн 1-р порт гэх мэт;
   - гогцоо ба давхар утас.

   Сервер 400 буцаах эсвэл тодорхой алдаа өгөх ёстой, 500 гарах ёсгүй. Шалгах тест: Task 2, `parseCircuit` болон `validateCircuit` тестүүд.
5. **Багш оролтын тоог өөрчилсний дараа хуучин хүснэгт илгээгдэх.** Форм хүснэгтийг 0-ээр дахин үүсгэнэ, сервер буруу хэмжээг татгалзана. Шалгах тест: Task 1, "parseLogicSpec checks the table…".

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `src/lib/logic/gates.ts` (шинэ) | `GATE_TYPES`, `GateType`, `Bit`, `isGateType`, `gateArity`, `applyGate` |
| `src/lib/logic/spec.ts` (шинэ) | `LogicSpec`, `TruthTable`, хязгаарууд, `rowInputs`, `emptyTable`, `parseLogicSpec`, `parseLogicSpecJson` |
| `src/lib/logic/circuit.ts` (шинэ) | `Circuit`, `parseCircuit`, `inputId`, `outputId`, `MALFORMED` |
| `src/lib/logic/evaluate.ts` (шинэ) | `LogicError`, `validateCircuit`, `evaluateRow`, `truthTable`, `wouldCreateCycle` |
| `src/lib/logic/grade.ts` (шинэ) | `LogicGrade`, `gradeLogic` |
| `src/lib/logic/expression.ts` (шинэ) | `parseExpression`, `evaluateExpr`, `expressionTable` |
| `src/lib/logic/flow.ts` (шинэ) | React Flow-ийн node/edge ↔ `Circuit` хөрвүүлэлт |
| `src/lib/logic/*.test.ts` (шинэ) | Unit тестүүд |
| `src/lib/db/schema.ts`, `drizzle/0003_*.sql` | Шинэ баганууд, check constraint |
| `src/lib/types.ts`, `src/lib/db/challenges.ts`, `src/lib/db/contests.ts` (+ тестүүд) | Төрөл, унших/бичих |
| `src/app/modules/[moduleId]/page.tsx`, `src/app/teacher/content/page.tsx` | "logic" шошго |
| `src/app/api/challenges/[challengeId]/submit/route.ts` | `case "logic"`, `LogicResultDto` |
| `src/app/api/contests/[contestId]/problems/[problemId]/submit/route.ts` | `kind === "logic"` салаа |
| `src/components/logic/gate-symbol.tsx` (шинэ) | IB дүрсийн SVG |
| `src/components/logic/use-circuit.ts` (шинэ) | Editor-ын төлөвийн hook |
| `src/components/logic/circuit-editor.tsx` (шинэ) | React Flow canvas, palette, симуляци |
| `src/components/logic/logic-solver.tsx` (шинэ) | Editor + товчнууд + үр дүн (модуль болон тэмцээн) |
| `src/components/logic/logic-constraints.tsx` (шинэ) | Хязгаарлалтын хайрцаг |
| `src/components/logic/logic-workspace.tsx` (шинэ) | Модулийн бодлогын хоёр талбарт layout |
| `src/components/challenge/hint-box.tsx` (шинэ) | `ChallengeWorkspace`-ээс гаргаж авсан hint товч |
| `src/components/challenge/challenge-workspace.tsx`, `challenge-quiz.tsx` | `HintBox` ашиглах, quiz-ийн төрөл |
| `src/app/challenges/[challengeId]/page.tsx`, `src/app/contests/[contestId]/problems/[problemId]/page.tsx` | Logic салаа |
| `src/components/teacher/logic-spec-fields.tsx` (шинэ) | Багшийн формын logic хэсэг |
| `src/components/teacher/challenge-form.tsx`, `contest-problem-form.tsx`, `src/lib/teacher-actions.ts`, `src/lib/contest-actions.ts` | Багшийн засварлагч |
| `src/components/logic/gate-table.tsx` (шинэ), `src/components/mdx/mdx-content.tsx` | Хичээлийн `<Gate>`, `<GateTable>` |
| `content/modules/module-07.mdx`, `scripts/seed-logic.ts` (шинэ), `package.json`, `README.md` | Контент, seed |

---

### Task 1: Хаалга ба spec (`gates.ts`, `spec.ts`)

**Files:**
- Create: `src/lib/logic/gates.ts`, `src/lib/logic/spec.ts`
- Test: `src/lib/logic/gates.test.ts`, `src/lib/logic/spec.test.ts`

**Interfaces:**
- Consumes: юу ч үгүй.
- Produces:
  - `GATE_TYPES`, `type GateType`, `type Bit = 0 | 1`, `isGateType(v: unknown): v is GateType`, `gateArity(t): 1 | 2`, `applyGate(t, a: Bit, b: Bit): Bit`
  - `MAX_INPUTS = 4`, `MAX_OUTPUTS = 4`, `MAX_GATES = 60`, `interface LogicSpec`, `type TruthTable = string[]`
  - `rowInputs(n, row): Bit[]`, `emptyTable(inputCount, outputCount): TruthTable`
  - `type ParsedSpec = { ok: true; spec; table } | { ok: false; errors: string[] }`, `parseLogicSpec(rawSpec: unknown, rawTable: unknown): ParsedSpec`, `parseLogicSpecJson(specJson: string, tableJson: string): ParsedSpec`

- [ ] **Step 1: Тестүүдийг бичих**

`src/lib/logic/gates.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyGate, gateArity, GATE_TYPES, isGateType, type Bit, type GateType } from "@/lib/logic/gates";

// Outputs for (a, b) = 00, 01, 10, 11; NOT ignores b.
const TRUTH: Record<GateType, string> = {
  AND: "0001",
  OR: "0111",
  NOT: "1100",
  NAND: "1110",
  NOR: "1000",
  XOR: "0110",
  XNOR: "1001",
};
const PAIRS: [Bit, Bit][] = [[0, 0], [0, 1], [1, 0], [1, 1]];

test("every gate matches its truth table", () => {
  for (const type of GATE_TYPES) {
    assert.equal(PAIRS.map(([a, b]) => applyGate(type, a, b)).join(""), TRUTH[type], type);
  }
});

test("NOT takes one input, the rest two", () => {
  for (const type of GATE_TYPES) assert.equal(gateArity(type), type === "NOT" ? 1 : 2, type);
});

test("isGateType accepts only the seven names", () => {
  assert.equal(isGateType("NAND"), true);
  for (const bad of ["nand", "BUF", "", 1, null, undefined]) assert.equal(isGateType(bad), false);
});
```

`src/lib/logic/spec.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTable,
  parseLogicSpec,
  parseLogicSpecJson,
  rowInputs,
  type LogicSpec,
} from "@/lib/logic/spec";

const valid: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: ["AND", "OR"],
  max_gates: 3,
  table_visible: true,
};
const table = ["0", "0", "0", "1"];

function errs(patch: Record<string, unknown>): string[] {
  const r = parseLogicSpec({ ...valid, ...patch }, table);
  return r.ok ? [] : r.errors;
}

test("rowInputs counts up in binary with the first input as the high bit", () => {
  assert.deepEqual(rowInputs(2, 1), [0, 1]);
  assert.deepEqual(rowInputs(3, 6), [1, 1, 0]);
  assert.deepEqual(rowInputs(1, 0), [0]);
});

test("emptyTable has 2^n rows of zeros", () => {
  assert.deepEqual(emptyTable(2, 2), ["00", "00", "00", "00"]);
  assert.deepEqual(emptyTable(1, 1), ["0", "0"]);
});

test("parseLogicSpec accepts a valid spec and returns a clean copy", () => {
  const got = parseLogicSpec(
    { ...valid, allowed_gates: ["OR", "AND"], extra: "x", table_visible: "yes" },
    table
  );
  assert.deepEqual(got, {
    ok: true,
    spec: { ...valid, allowed_gates: ["AND", "OR"], table_visible: false },
    table,
  });
});

test("parseLogicSpec rejects bad names and counts", () => {
  const NAMES = "Оролт, гаралтын нэр бүр нэг том латин үсэг байх ёстой (A–Z).";
  assert.deepEqual(errs({ inputs: ["a", "B"] }), [NAMES]);
  assert.deepEqual(errs({ inputs: ["AB"] }), [NAMES]);
  assert.deepEqual(errs({ outputs: ["A"] }), ["Оролт, гаралтын нэрс давхцаж болохгүй."]);
  assert.deepEqual(errs({ inputs: [] }), ["Оролт 1–4 ширхэг байх ёстой."]);
  assert.deepEqual(errs({ inputs: ["A", "B", "C", "D", "E"] }), ["Оролт 1–4 ширхэг байх ёстой."]);
  assert.deepEqual(errs({ outputs: [] }), ["Гаралт 1–4 ширхэг байх ёстой."]);
});

test("parseLogicSpec rejects bad gate lists and limits", () => {
  assert.deepEqual(errs({ allowed_gates: [] }), ["Дор хаяж нэг хаалга зөвшөөрөгдсөн байх ёстой."]);
  assert.deepEqual(errs({ allowed_gates: ["AND", "BUF"] }), ["Хаалганы жагсаалт буруу байна."]);
  assert.deepEqual(errs({ allowed_gates: ["AND", "AND"] }), ["Хаалганы жагсаалт буруу байна."]);
  for (const max_gates of [0, 61, 2.5, "3"]) {
    assert.deepEqual(errs({ max_gates }), ["Хаалганы дээд тоо 1–60 хооронд байх ёстой."], String(max_gates));
  }
  assert.equal(parseLogicSpec({ ...valid, max_gates: null }, table).ok, true);
  assert.equal(parseLogicSpec({ ...valid, max_gates: 60 }, table).ok, true);
});

test("parseLogicSpec checks the table against the inputs and outputs", () => {
  const rows = { ok: false, errors: ["Үнэний хүснэгт 4 мөртэй байх ёстой."] };
  const width = { ok: false, errors: ["Хүснэгтийн мөр бүр 1 ширхэг 0/1 тэмдэгт байх ёстой."] };
  assert.deepEqual(parseLogicSpec(valid, ["0", "1"]), rows);
  assert.deepEqual(parseLogicSpec(valid, "0001"), rows);
  assert.deepEqual(parseLogicSpec(valid, ["0", "1", "1", "10"]), width);
  assert.deepEqual(parseLogicSpec(valid, ["0", "1", "1", "2"]), width);
});

test("parseLogicSpecJson treats broken JSON as missing", () => {
  assert.equal(parseLogicSpecJson(JSON.stringify(valid), JSON.stringify(table)).ok, true);
  assert.equal(parseLogicSpecJson("{oops", "[]").ok, false);
});
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npx tsx --test src/lib/logic/gates.test.ts src/lib/logic/spec.test.ts`
Expected: FAIL — `Cannot find module '@/lib/logic/gates'` (эсвэл `.../spec`).

- [ ] **Step 3: `gates.ts` бичих**

```ts
/** The seven gates of the IB syllabus: NOT takes one input, the rest two. */
export const GATE_TYPES = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"] as const;
export type GateType = (typeof GATE_TYPES)[number];
export type Bit = 0 | 1;

export function isGateType(v: unknown): v is GateType {
  return typeof v === "string" && (GATE_TYPES as readonly string[]).includes(v);
}

export function gateArity(type: GateType): 1 | 2 {
  return type === "NOT" ? 1 : 2;
}

/** `b` is ignored for NOT. */
export function applyGate(type: GateType, a: Bit, b: Bit): Bit {
  switch (type) {
    case "AND":
      return (a & b) as Bit;
    case "OR":
      return (a | b) as Bit;
    case "NOT":
      return (a ^ 1) as Bit;
    case "NAND":
      return ((a & b) ^ 1) as Bit;
    case "NOR":
      return ((a | b) ^ 1) as Bit;
    case "XOR":
      return (a ^ b) as Bit;
    case "XNOR":
      return (a ^ b ^ 1) as Bit;
  }
}
```

- [ ] **Step 4: `spec.ts` бичих**

```ts
import { GATE_TYPES, isGateType, type Bit, type GateType } from "@/lib/logic/gates";

export const MAX_INPUTS = 4;
export const MAX_OUTPUTS = 4;
/** Hard cap on gates in any circuit, and the ceiling for max_gates. */
export const MAX_GATES = 60;

/** The part of a logic problem the student sees. */
export interface LogicSpec {
  /** 1–4 single capital letters, e.g. ["A", "B"]. */
  inputs: string[];
  /** 1–4 single capital letters, distinct from the inputs. */
  outputs: string[];
  allowed_gates: GateType[];
  /** null = only the global MAX_GATES cap. */
  max_gates: number | null;
  /** Whether students see the expected truth table. */
  table_visible: boolean;
}

/**
 * Expected (or computed) outputs: one string per input combination, rows
 * counting up in binary with inputs[0] as the most significant bit; each
 * string holds one "0"/"1" per output, in outputs order.
 */
export type TruthTable = string[];

const NAME_RE = /^[A-Z]$/;

/** The input bits of `row` for `n` inputs, inputs[0] first. */
export function rowInputs(n: number, row: number): Bit[] {
  return Array.from({ length: n }, (_, j) => ((row >> (n - 1 - j)) & 1) as Bit);
}

export function emptyTable(inputCount: number, outputCount: number): TruthTable {
  return Array.from({ length: 2 ** inputCount }, () => "0".repeat(outputCount));
}

export type ParsedSpec =
  | { ok: true; spec: LogicSpec; table: TruthTable }
  | { ok: false; errors: string[] };

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/** Validates teacher input (forms, seeds) and returns clean copies. */
export function parseLogicSpec(rawSpec: unknown, rawTable: unknown): ParsedSpec {
  const s =
    typeof rawSpec === "object" && rawSpec !== null ? (rawSpec as Record<string, unknown>) : {};
  const inputs = list(s.inputs);
  const outputs = list(s.outputs);
  const gates = list(s.allowed_gates);
  const max = s.max_gates ?? null;
  const errors: string[] = [];

  if (inputs.length < 1 || inputs.length > MAX_INPUTS) {
    errors.push(`Оролт 1–${MAX_INPUTS} ширхэг байх ёстой.`);
  }
  if (outputs.length < 1 || outputs.length > MAX_OUTPUTS) {
    errors.push(`Гаралт 1–${MAX_OUTPUTS} ширхэг байх ёстой.`);
  }
  const names = [...inputs, ...outputs];
  if (!names.every((n) => typeof n === "string" && NAME_RE.test(n))) {
    errors.push("Оролт, гаралтын нэр бүр нэг том латин үсэг байх ёстой (A–Z).");
  } else if (new Set(names).size !== names.length) {
    errors.push("Оролт, гаралтын нэрс давхцаж болохгүй.");
  }
  if (gates.length === 0) {
    errors.push("Дор хаяж нэг хаалга зөвшөөрөгдсөн байх ёстой.");
  } else if (!gates.every(isGateType) || new Set(gates).size !== gates.length) {
    errors.push("Хаалганы жагсаалт буруу байна.");
  }
  if (
    max !== null &&
    !(typeof max === "number" && Number.isInteger(max) && max >= 1 && max <= MAX_GATES)
  ) {
    errors.push(`Хаалганы дээд тоо 1–${MAX_GATES} хооронд байх ёстой.`);
  }
  if (errors.length > 0) return { ok: false, errors };

  const rows = 2 ** inputs.length;
  if (!Array.isArray(rawTable) || rawTable.length !== rows) {
    return { ok: false, errors: [`Үнэний хүснэгт ${rows} мөртэй байх ёстой.`] };
  }
  const width = outputs.length;
  if (!rawTable.every((r) => typeof r === "string" && r.length === width && /^[01]+$/.test(r))) {
    return { ok: false, errors: [`Хүснэгтийн мөр бүр ${width} ширхэг 0/1 тэмдэгт байх ёстой.`] };
  }

  return {
    ok: true,
    spec: {
      inputs: [...inputs] as string[],
      outputs: [...outputs] as string[],
      allowed_gates: GATE_TYPES.filter((g) => gates.includes(g)),
      max_gates: max as number | null,
      table_visible: s.table_visible === true,
    },
    table: [...(rawTable as string[])],
  };
}

/** parseLogicSpec for the two JSON strings a form posts; broken JSON counts as missing. */
export function parseLogicSpecJson(specJson: string, tableJson: string): ParsedSpec {
  const parse = (text: string): unknown => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };
  return parseLogicSpec(parse(specJson), parse(tableJson));
}
```

- [ ] **Step 5: Тест давахыг шалгах**

Run: `npx tsx --test src/lib/logic/gates.test.ts src/lib/logic/spec.test.ts`
Expected: PASS — 10 тест, 0 fail.

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` алдаагүй. Commit хийхгүй.

---

### Task 2: Хэлхээ задлах, үнэлэх, дүгнэх (`circuit.ts`, `evaluate.ts`, `grade.ts`)

**Files:**
- Create: `src/lib/logic/circuit.ts`, `src/lib/logic/evaluate.ts`, `src/lib/logic/grade.ts`
- Test: `src/lib/logic/circuit.test.ts`, `src/lib/logic/evaluate.test.ts`, `src/lib/logic/grade.test.ts`

**Interfaces:**
- Consumes (Task 1): `GATE_TYPES`, `GateType`, `Bit`, `isGateType`, `gateArity`, `applyGate`, `LogicSpec`, `TruthTable`, `MAX_GATES`, `rowInputs`.
- Produces:
  - `MALFORMED = "Хэлхээ буруу форматтай байна."`, `MAX_WIRES = 200`, `MAX_CIRCUIT_JSON = 20000`
  - `interface CircuitGate { id; type: GateType; x; y }`, `interface CircuitWire { from; to; port }`, `interface Circuit { gates; wires }`
  - `inputId(name) = "in:" + name`, `outputId(name) = "out:" + name`
  - `parseCircuit(raw: unknown): { ok: true; circuit: Circuit } | { ok: false; message: string }`
  - `interface LogicError { message: string; gateIds?: string[] }`
  - `validateCircuit(c, spec): LogicError[]`, `evaluateRow(c, spec, bits: Bit[]): Map<string, Bit | null>`, `truthTable(c, spec): TruthTable`, `wouldCreateCycle(c, from, to): boolean`
  - `type LogicGrade` (`malformed` | `invalid` | `graded`), `gradeLogic(spec, expected, raw): LogicGrade`

- [ ] **Step 1: Тестүүдийг бичих**

`src/lib/logic/circuit.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MALFORMED,
  MAX_CIRCUIT_JSON,
  MAX_WIRES,
  parseCircuit,
  type Circuit,
} from "@/lib/logic/circuit";
import { MAX_GATES } from "@/lib/logic/spec";

const good: Circuit = {
  gates: [{ id: "g1", type: "AND", x: 10, y: -20 }],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "g1", to: "out:Q", port: 0 },
  ],
};
const fail = { ok: false, message: MALFORMED };

test("parseCircuit accepts objects and JSON strings", () => {
  assert.deepEqual(parseCircuit(good), { ok: true, circuit: good });
  assert.deepEqual(parseCircuit(JSON.stringify(good)), { ok: true, circuit: good });
});

test("parseCircuit keeps only known fields and rounds positions", () => {
  const messy = {
    extra: 1,
    gates: [{ id: "g1", type: "AND", x: 10.4, y: -19.6, color: "red" }],
    wires: [{ from: "in:A", to: "g1", port: 0, note: "x" }],
  };
  assert.deepEqual(parseCircuit(messy), {
    ok: true,
    circuit: {
      gates: [{ id: "g1", type: "AND", x: 10, y: -20 }],
      wires: [{ from: "in:A", to: "g1", port: 0 }],
    },
  });
});

test("parseCircuit rejects anything malformed", () => {
  const g = good.gates[0];
  const bad: unknown[] = [
    null,
    42,
    "not json",
    "[]",
    { gates: [] },
    { wires: [] },
    { gates: [{ ...g, type: "BUF" }], wires: [] },
    { gates: [{ ...g, id: "G1" }], wires: [] },
    { gates: [g, g], wires: [] },
    { gates: [{ ...g, x: Number.NaN }], wires: [] },
    { gates: [{ ...g, y: 1e6 }], wires: [] },
    { gates: [g], wires: [{ from: "in:A", to: "g1", port: 2 }] },
    { gates: [g], wires: [{ from: "in:a", to: "g1", port: 0 }] },
    { gates: [g], wires: [{ from: "in:A", to: "g1" }] },
    { gates: Array.from({ length: MAX_GATES + 1 }, (_, i) => ({ ...g, id: `g${i}` })), wires: [] },
    {
      gates: [],
      wires: Array.from({ length: MAX_WIRES + 1 }, () => ({ from: "in:A", to: "out:Q", port: 0 })),
    },
    "x".repeat(MAX_CIRCUIT_JSON + 1),
  ];
  for (const raw of bad) {
    assert.deepEqual(parseCircuit(raw), fail, String(JSON.stringify(raw)).slice(0, 80));
  }
});
```

`src/lib/logic/evaluate.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GATE_TYPES, type GateType } from "@/lib/logic/gates";
import { MALFORMED, type Circuit } from "@/lib/logic/circuit";
import {
  evaluateRow,
  truthTable,
  validateCircuit,
  wouldCreateCycle,
} from "@/lib/logic/evaluate";
import type { LogicSpec } from "@/lib/logic/spec";

const spec: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: [...GATE_TYPES],
  max_gates: null,
  table_visible: true,
};
const gate = (id: string, type: GateType) => ({ id, type, x: 0, y: 0 });
const wire = (from: string, to: string, port = 0) => ({ from, to, port });
const and: Circuit = {
  gates: [gate("g1", "AND")],
  wires: [wire("in:A", "g1", 0), wire("in:B", "g1", 1), wire("g1", "out:Q")],
};
const loop: Circuit = {
  gates: [gate("g1", "OR"), gate("g2", "NOT")],
  wires: [wire("in:A", "g1", 0), wire("g2", "g1", 1), wire("g1", "g2"), wire("g1", "out:Q")],
};

test("an AND circuit gives AND's truth table", () => {
  assert.deepEqual(validateCircuit(and, spec), []);
  assert.deepEqual(truthTable(and, spec), ["0", "0", "0", "1"]);
});

test("a half adder fills both outputs", () => {
  const ha: LogicSpec = { ...spec, outputs: ["S", "C"] };
  const c: Circuit = {
    gates: [gate("x", "XOR"), gate("a", "AND")],
    wires: [
      wire("in:A", "x", 0),
      wire("in:B", "x", 1),
      wire("in:A", "a", 0),
      wire("in:B", "a", 1),
      wire("x", "out:S"),
      wire("a", "out:C"),
    ],
  };
  assert.deepEqual(validateCircuit(c, ha), []);
  assert.deepEqual(truthTable(c, ha), ["00", "10", "10", "01"]);
});

test("NOT chains work and an unused input is fine", () => {
  const c: Circuit = {
    gates: [gate("n1", "NOT"), gate("n2", "NOT")],
    wires: [wire("in:A", "n1"), wire("n1", "n2"), wire("n2", "out:Q")],
  };
  assert.deepEqual(validateCircuit(c, spec), []);
  assert.deepEqual(truthTable(c, spec), ["0", "0", "1", "1"]);
});

test("a gate that feeds nothing is allowed", () => {
  const c: Circuit = {
    gates: [...and.gates, gate("g2", "OR")],
    wires: [...and.wires, wire("in:A", "g2", 0), wire("in:B", "g2", 1)],
  };
  assert.deepEqual(validateCircuit(c, spec), []);
});

test("disallowed gates are reported once per type with every offender", () => {
  const c: Circuit = { gates: [gate("g1", "AND"), gate("g2", "AND"), gate("g3", "NAND")], wires: [] };
  assert.deepEqual(validateCircuit(c, { ...spec, allowed_gates: ["NAND"] })[0], {
    message: "AND хаалга энэ бодлогод зөвшөөрөгдөөгүй.",
    gateIds: ["g1", "g2"],
  });
});

test("too many gates", () => {
  const c: Circuit = { gates: [...and.gates, gate("g2", "NOT")], wires: [...and.wires, wire("in:A", "g2")] };
  assert.deepEqual(validateCircuit(c, { ...spec, max_gates: 1 }), [
    { message: "Хаалга хэт олон байна: 2 / 1." },
  ]);
});

test("wires with impossible ends are malformed", () => {
  const bad = [
    wire("g9", "out:Q"),
    wire("in:A", "g9"),
    wire("out:Q", "g1"),
    wire("g1", "in:A"),
    wire("in:Z", "g1"),
    wire("g1", "out:Z"),
    wire("g1", "out:Q", 1),
  ];
  for (const w of bad) {
    assert.deepEqual(validateCircuit({ ...and, wires: [...and.wires, w] }, spec), [{ message: MALFORMED }], JSON.stringify(w));
  }
  const not: Circuit = { gates: [gate("n", "NOT")], wires: [wire("in:A", "n", 1)] };
  assert.deepEqual(validateCircuit(not, spec), [{ message: MALFORMED }]);
});

test("two wires into one input", () => {
  assert.deepEqual(validateCircuit({ ...and, wires: [...and.wires, wire("in:A", "g1", 1)] }, spec), [
    { message: "Нэг оролтод хоёр утас холбогдсон байна.", gateIds: ["g1"] },
  ]);
  assert.deepEqual(validateCircuit({ ...and, wires: [...and.wires, wire("in:A", "out:Q")] }, spec), [
    { message: "Нэг оролтод хоёр утас холбогдсон байна." },
  ]);
});

test("unwired gate inputs and outputs are named", () => {
  const c: Circuit = {
    gates: [gate("g1", "AND"), gate("g2", "AND")],
    wires: [wire("in:A", "g1", 0), wire("g1", "g2", 0), wire("g1", "g2", 1)],
  };
  assert.deepEqual(validateCircuit(c, spec), [
    { message: "AND хаалганы оролт холбогдоогүй байна.", gateIds: ["g1"] },
    { message: "Q гаралт холбогдоогүй байна." },
  ]);
});

test("a loop is reported with its gates", () => {
  assert.deepEqual(validateCircuit(loop, spec), [
    {
      message: "Хэлхээнд гогцоо байна — хаалганы гаралт өөрийнхөө оролт руу буцаж орсон.",
      gateIds: ["g1", "g2"],
    },
  ]);
});

test("evaluateRow gives null where a signal is undecidable", () => {
  const c: Circuit = {
    gates: [gate("g1", "AND"), gate("g2", "NOT")],
    wires: [wire("in:A", "g1", 0), wire("in:B", "g2"), wire("g1", "out:Q")],
  };
  const v = evaluateRow(c, spec, [1, 0]);
  assert.equal(v.get("in:A"), 1);
  assert.equal(v.get("g2"), 1);
  assert.equal(v.get("g1"), null);
  assert.equal(v.get("out:Q"), null);

  const l = evaluateRow(loop, spec, [1, 1]);
  assert.equal(l.get("g1"), null);
  assert.equal(l.get("g2"), null);
  assert.equal(l.get("out:Q"), null);
});

test("wouldCreateCycle follows existing wires", () => {
  const c: Circuit = {
    gates: [gate("g1", "NOT"), gate("g2", "NOT"), gate("g3", "NOT")],
    wires: [wire("g1", "g2"), wire("g2", "g3")],
  };
  assert.equal(wouldCreateCycle(c, "g3", "g1"), true);
  assert.equal(wouldCreateCycle(c, "g1", "g1"), true);
  assert.equal(wouldCreateCycle(c, "g1", "g3"), false);
  assert.equal(wouldCreateCycle(c, "in:A", "g1"), false);
});
```

`src/lib/logic/grade.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { GateType } from "@/lib/logic/gates";
import { MALFORMED, type Circuit } from "@/lib/logic/circuit";
import { gradeLogic } from "@/lib/logic/grade";
import type { LogicSpec } from "@/lib/logic/spec";

const spec: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: ["AND", "OR"],
  max_gates: null,
  table_visible: false,
};
const expected = ["0", "0", "0", "1"];
const circuitOf = (type: GateType): Circuit => ({
  gates: [{ id: "g1", type, x: 0, y: 0 }],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "g1", to: "out:Q", port: 0 },
  ],
});

test("a correct circuit gets every row", () => {
  const r = gradeLogic(spec, expected, circuitOf("AND"));
  assert.equal(r.status, "graded");
  if (r.status !== "graded") return;
  assert.deepEqual([r.correctRows, r.totalRows, r.table], [4, 4, expected]);
  assert.deepEqual(r.circuit, circuitOf("AND"));
});

test("a wrong circuit gets the rows it matches", () => {
  const r = gradeLogic(spec, expected, JSON.stringify(circuitOf("OR")));
  assert.equal(r.status === "graded" && r.correctRows, 2);
});

test("a structurally broken circuit is invalid, not graded", () => {
  const broken: Circuit = { ...circuitOf("AND"), wires: [{ from: "in:A", to: "g1", port: 0 }] };
  const r = gradeLogic(spec, expected, broken);
  assert.equal(r.status, "invalid");
  assert.equal(r.status === "invalid" && r.errors.length > 0, true);
});

test("garbage is malformed", () => {
  assert.deepEqual(gradeLogic(spec, expected, "{"), { status: "malformed", message: MALFORMED });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npx tsx --test src/lib/logic/circuit.test.ts src/lib/logic/evaluate.test.ts src/lib/logic/grade.test.ts`
Expected: FAIL — `Cannot find module '@/lib/logic/circuit'`.

- [ ] **Step 3: `circuit.ts` бичих**

```ts
import { isGateType, type GateType } from "@/lib/logic/gates";
import { MAX_GATES } from "@/lib/logic/spec";

export const MAX_WIRES = 200;
export const MAX_CIRCUIT_JSON = 20_000;
const COORD_LIMIT = 100_000;
const GATE_ID_RE = /^[a-z0-9_-]{1,24}$/;
/** A wire end: an input or output terminal, or a gate id. */
const END_RE = /^(in:[A-Z]|out:[A-Z]|[a-z0-9_-]{1,24})$/;

export const MALFORMED = "Хэлхээ буруу форматтай байна.";

export interface CircuitGate {
  id: string;
  type: GateType;
  x: number;
  y: number;
}

/** `port` is the gate input the wire drives (0 for an output terminal). */
export interface CircuitWire {
  from: string;
  to: string;
  port: number;
}

/** A student's answer. Terminals are implied by the spec, so only gates and wires are stored. */
export interface Circuit {
  gates: CircuitGate[];
  wires: CircuitWire[];
}

export const inputId = (name: string) => `in:${name}`;
export const outputId = (name: string) => `out:${name}`;

export type ParsedCircuit = { ok: true; circuit: Circuit } | { ok: false; message: string };

function isCoord(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= COORD_LIMIT;
}

/** Turns untrusted input (a request body or a stored snapshot) into a Circuit. */
export function parseCircuit(raw: unknown): ParsedCircuit {
  const fail: ParsedCircuit = { ok: false, message: MALFORMED };
  let value: unknown = raw;
  if (typeof raw === "string") {
    if (raw.length > MAX_CIRCUIT_JSON) return fail;
    try {
      value = JSON.parse(raw);
    } catch {
      return fail;
    }
  } else if ((JSON.stringify(raw ?? null) ?? "").length > MAX_CIRCUIT_JSON) {
    return fail;
  }
  if (typeof value !== "object" || value === null) return fail;

  const { gates, wires } = value as { gates?: unknown; wires?: unknown };
  if (!Array.isArray(gates) || !Array.isArray(wires)) return fail;
  if (gates.length > MAX_GATES || wires.length > MAX_WIRES) return fail;

  const ids = new Set<string>();
  const outGates: CircuitGate[] = [];
  for (const g of gates) {
    if (typeof g !== "object" || g === null) return fail;
    const { id, type, x, y } = g as Record<string, unknown>;
    if (typeof id !== "string" || !GATE_ID_RE.test(id) || ids.has(id)) return fail;
    if (!isGateType(type) || !isCoord(x) || !isCoord(y)) return fail;
    ids.add(id);
    outGates.push({ id, type, x: Math.round(x), y: Math.round(y) });
  }

  const outWires: CircuitWire[] = [];
  for (const w of wires) {
    if (typeof w !== "object" || w === null) return fail;
    const { from, to, port } = w as Record<string, unknown>;
    if (typeof from !== "string" || !END_RE.test(from)) return fail;
    if (typeof to !== "string" || !END_RE.test(to)) return fail;
    if (port !== 0 && port !== 1) return fail;
    outWires.push({ from, to, port });
  }
  return { ok: true, circuit: { gates: outGates, wires: outWires } };
}
```

- [ ] **Step 4: `evaluate.ts` бичих**

```ts
import { applyGate, gateArity, type Bit } from "@/lib/logic/gates";
import {
  inputId,
  MALFORMED,
  outputId,
  type Circuit,
  type CircuitGate,
} from "@/lib/logic/circuit";
import { rowInputs, type LogicSpec, type TruthTable } from "@/lib/logic/spec";

/** A problem with a student's circuit; the editor highlights gateIds. */
export interface LogicError {
  message: string;
  gateIds?: string[];
}

const LOOP = "Хэлхээнд гогцоо байна — хаалганы гаралт өөрийнхөө оролт руу буцаж орсон.";

const portKey = (to: string, port: number) => `${to}#${port}`;

/** Everything that stops a circuit from being graded; [] means it is well formed. */
export function validateCircuit(circuit: Circuit, spec: LogicSpec): LogicError[] {
  const errors: LogicError[] = [];
  // Same message → one error listing every gate involved.
  const add = (message: string, gateId?: string) => {
    let error = errors.find((e) => e.message === message);
    if (!error) {
      error = { message };
      errors.push(error);
    }
    if (gateId) error.gateIds = [...(error.gateIds ?? []), gateId];
  };
  const gates = new Map(circuit.gates.map((g) => [g.id, g]));

  for (const g of circuit.gates) {
    if (!spec.allowed_gates.includes(g.type)) {
      add(`${g.type} хаалга энэ бодлогод зөвшөөрөгдөөгүй.`, g.id);
    }
  }
  if (spec.max_gates !== null && circuit.gates.length > spec.max_gates) {
    add(`Хаалга хэт олон байна: ${circuit.gates.length} / ${spec.max_gates}.`);
  }

  const inputs = new Set(spec.inputs.map(inputId));
  const outputs = new Set(spec.outputs.map(outputId));
  const feeds = new Map<string, number>();
  for (const w of circuit.wires) {
    const target = gates.get(w.to);
    const fromOk = inputs.has(w.from) || gates.has(w.from);
    const toOk = target ? w.port < gateArity(target.type) : outputs.has(w.to) && w.port === 0;
    // The editor never draws these; later checks would only add noise.
    if (!fromOk || !toOk) return [...errors, { message: MALFORMED }];
    const key = portKey(w.to, w.port);
    feeds.set(key, (feeds.get(key) ?? 0) + 1);
  }

  for (const [key, count] of feeds) {
    if (count < 2) continue;
    const to = key.slice(0, key.lastIndexOf("#"));
    add("Нэг оролтод хоёр утас холбогдсон байна.", gates.has(to) ? to : undefined);
  }
  for (const g of circuit.gates) {
    for (let port = 0; port < gateArity(g.type); port++) {
      if (!feeds.has(portKey(g.id, port))) {
        add(`${g.type} хаалганы оролт холбогдоогүй байна.`, g.id);
        break;
      }
    }
  }
  for (const name of spec.outputs) {
    if (!feeds.has(portKey(outputId(name), 0))) add(`${name} гаралт холбогдоогүй байна.`);
  }
  for (const id of gatesInLoops(circuit, gates)) add(LOOP, id);
  return errors;
}

/** Kahn's algorithm: gates left over sit on (or are fed by) a loop. */
function gatesInLoops(circuit: Circuit, gates: Map<string, CircuitGate>): string[] {
  const indegree = new Map([...gates.keys()].map((id) => [id, 0]));
  const next = new Map<string, string[]>();
  for (const w of circuit.wires) {
    if (!gates.has(w.from) || !gates.has(w.to)) continue;
    indegree.set(w.to, indegree.get(w.to)! + 1);
    next.set(w.from, [...(next.get(w.from) ?? []), w.to]);
  }
  const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  for (let i = 0; i < queue.length; i++) {
    for (const to of next.get(queue[i]) ?? []) {
      const d = indegree.get(to)! - 1;
      indegree.set(to, d);
      if (d === 0) queue.push(to);
    }
  }
  return [...indegree].filter(([, d]) => d > 0).map(([id]) => id);
}

/**
 * The signal on every input, gate and output terminal for one row of
 * inputs. null where it cannot be decided (an unwired input or a loop),
 * so the editor can simulate half-built circuits.
 */
export function evaluateRow(circuit: Circuit, spec: LogicSpec, bits: Bit[]): Map<string, Bit | null> {
  const values = new Map<string, Bit | null>();
  spec.inputs.forEach((name, i) => values.set(inputId(name), bits[i] ?? 0));
  const gates = new Map(circuit.gates.map((g) => [g.id, g]));
  const source = new Map<string, string>();
  for (const w of circuit.wires) {
    const key = portKey(w.to, w.port);
    if (!source.has(key)) source.set(key, w.from);
  }
  const visiting = new Set<string>();

  const feed = (to: string, port: number): Bit | null => {
    const from = source.get(portKey(to, port));
    return from === undefined ? null : valueOf(from);
  };
  const valueOf = (id: string): Bit | null => {
    if (values.has(id)) return values.get(id) ?? null;
    const gate = gates.get(id);
    if (!gate || visiting.has(id)) return null;
    visiting.add(id);
    const a = feed(id, 0);
    const b = gateArity(gate.type) === 2 ? feed(id, 1) : 0;
    visiting.delete(id);
    const out = a === null || b === null ? null : applyGate(gate.type, a, b);
    values.set(id, out);
    return out;
  };

  for (const g of circuit.gates) valueOf(g.id);
  for (const name of spec.outputs) values.set(outputId(name), feed(outputId(name), 0));
  return values;
}

/** Every row's outputs. Only meaningful once validateCircuit found nothing. */
export function truthTable(circuit: Circuit, spec: LogicSpec): TruthTable {
  return Array.from({ length: 2 ** spec.inputs.length }, (_, row) => {
    const values = evaluateRow(circuit, spec, rowInputs(spec.inputs.length, row));
    return spec.outputs.map((name) => String(values.get(outputId(name)) ?? 0)).join("");
  });
}

/** Whether a new wire from → to would close a loop; the editor refuses those. */
export function wouldCreateCycle(circuit: Circuit, from: string, to: string): boolean {
  if (from === to) return true;
  const next = new Map<string, string[]>();
  for (const w of circuit.wires) next.set(w.from, [...(next.get(w.from) ?? []), w.to]);
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  return false;
}
```

- [ ] **Step 5: `grade.ts` бичих**

```ts
import { parseCircuit, type Circuit } from "@/lib/logic/circuit";
import { truthTable, validateCircuit, type LogicError } from "@/lib/logic/evaluate";
import type { LogicSpec, TruthTable } from "@/lib/logic/spec";

/**
 * malformed — not a circuit at all (the UI never sends one): reject, no attempt.
 * invalid   — a circuit with structural errors: a failed attempt.
 * graded    — compared row by row with the expected table.
 */
export type LogicGrade =
  | { status: "malformed"; message: string }
  | { status: "invalid"; circuit: Circuit; errors: LogicError[] }
  | { status: "graded"; circuit: Circuit; table: TruthTable; correctRows: number; totalRows: number };

/** Server-side grading shared by module challenges and contests. */
export function gradeLogic(spec: LogicSpec, expected: TruthTable, raw: unknown): LogicGrade {
  const parsed = parseCircuit(raw);
  if (!parsed.ok) return { status: "malformed", message: parsed.message };
  const { circuit } = parsed;
  const errors = validateCircuit(circuit, spec);
  if (errors.length > 0) return { status: "invalid", circuit, errors };
  const table = truthTable(circuit, spec);
  const correctRows = table.filter((row, i) => row === expected[i]).length;
  return { status: "graded", circuit, table, correctRows, totalRows: table.length };
}
```

- [ ] **Step 6: Тест давахыг шалгах**

Run: `npx tsx --test src/lib/logic/circuit.test.ts src/lib/logic/evaluate.test.ts src/lib/logic/grade.test.ts`
Expected: PASS — 19 тест, 0 fail.

- [ ] **Step 7: Checkpoint** — `npx tsc --noEmit` алдаагүй. Commit хийхгүй.

---

### Task 3: Boolean илэрхийллийн parser (`expression.ts`)

**Files:**
- Create: `src/lib/logic/expression.ts`
- Test: `src/lib/logic/expression.test.ts`

**Interfaces:**
- Consumes (Task 1): `applyGate`, `Bit`, `GateType`, `rowInputs`, `LogicSpec`, `TruthTable`.
- Produces:
  - `type Expr`, `parseExpression(src: string, inputs: string[]): { ok: true; expr: Expr } | { ok: false; message: string }`
  - `evaluateExpr(expr, env: Record<string, Bit>): Bit`
  - `expressionTable(exprs: string[], spec: Pick<LogicSpec, "inputs" | "outputs">): { ok: true; table: TruthTable } | { ok: false; errors: { output: string; message: string }[] }`

- [ ] **Step 1: Тест бичих**

`src/lib/logic/expression.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Bit } from "@/lib/logic/gates";
import { expressionTable, parseExpression } from "@/lib/logic/expression";
import { rowInputs } from "@/lib/logic/spec";

const ABC = ["A", "B", "C"];

/** Table of one expression over A, B, C. */
function tableOf(expr: string): string[] {
  const r = expressionTable([expr], { inputs: ABC, outputs: ["Q"] });
  if (!r.ok) throw new Error(r.errors[0].message);
  return r.table;
}

/** The same table from a JS function. */
function truth(fn: (a: Bit, b: Bit, c: Bit) => boolean | number): string[] {
  return Array.from({ length: 8 }, (_, i) => {
    const [a, b, c] = rowInputs(3, i);
    return fn(a, b, c) ? "1" : "0";
  });
}

function message(src: string, inputs = ["A", "B"]): string {
  const r = parseExpression(src, inputs);
  return r.ok ? "" : r.message;
}

test("NOT binds tightest, then AND, then XOR, then OR", () => {
  assert.deepEqual(tableOf("A OR B AND C"), truth((a, b, c) => a | (b & c)));
  assert.deepEqual(tableOf("NOT A AND B"), truth((a, b) => (a ^ 1) & b));
  assert.deepEqual(tableOf("A XOR B OR C"), truth((a, b, c) => (a ^ b) | c));
  assert.deepEqual(tableOf("A AND B XOR C"), truth((a, b, c) => (a & b) ^ c));
  assert.deepEqual(tableOf("A NOR B NAND C"), truth((a, b, c) => (a | ((b & c) ^ 1)) ^ 1));
});

test("chains are left-associative and parentheses override", () => {
  assert.deepEqual(tableOf("A NAND B NAND C"), truth((a, b, c) => (((a & b) ^ 1) & c) ^ 1));
  assert.deepEqual(tableOf("(A OR B) AND C"), truth((a, b, c) => (a | b) & c));
  assert.deepEqual(tableOf("NOT NOT A"), truth((a) => a));
  assert.deepEqual(tableOf("A XNOR B"), truth((a, b) => a === b));
});

test("keywords and names are case-insensitive", () => {
  assert.deepEqual(tableOf("a and not b"), truth((a, b) => a & (b ^ 1)));
});

test("errors say what and where", () => {
  assert.equal(message(""), "Илэрхийлэл хоосон байна.");
  assert.equal(message("(A AND B"), "1-р тэмдэгтэд нээсэн хаалт хаагдаагүй байна.");
  assert.equal(message("A AND"), "Илэрхийлэл дутуу байна.");
  assert.equal(message("A B"), "3-р тэмдэгтэд «B» байх ёсгүй.");
  assert.equal(message("A )"), "3-р тэмдэгтэд «)» байх ёсгүй.");
  assert.equal(message("AND A"), "1-р тэмдэгтэд «AND» байх ёсгүй.");
  assert.equal(message("A AND D"), "«D» гэсэн оролт алга.");
  assert.equal(message("A & B"), "3-р тэмдэгт «&» танигдсангүй.");
  assert.equal(message("A ANDD B"), "3-р тэмдэгтэд «ANDD» гэсэн үг танигдсангүй.");
});

test("expressionTable fills several outputs and reports each broken one", () => {
  assert.deepEqual(expressionTable(["A XOR B", "A AND B"], { inputs: ["A", "B"], outputs: ["S", "C"] }), {
    ok: true,
    table: ["00", "10", "10", "01"],
  });
  assert.deepEqual(expressionTable(["A OR", ""], { inputs: ["A", "B"], outputs: ["S", "C"] }), {
    ok: false,
    errors: [
      { output: "S", message: "Илэрхийлэл дутуу байна." },
      { output: "C", message: "Илэрхийлэл хоосон байна." },
    ],
  });
});
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npx tsx --test src/lib/logic/expression.test.ts`
Expected: FAIL — `Cannot find module '@/lib/logic/expression'`.

- [ ] **Step 3: `expression.ts` бичих**

```ts
import { applyGate, type Bit, type GateType } from "@/lib/logic/gates";
import { rowInputs, type LogicSpec, type TruthTable } from "@/lib/logic/spec";

type BinaryGate = Exclude<GateType, "NOT">;

export type Expr =
  | { kind: "var"; name: string }
  | { kind: "not"; arg: Expr }
  | { kind: "bin"; op: BinaryGate; left: Expr; right: Expr };

type Token =
  | { kind: "word"; text: string; pos: number }
  | { kind: "lparen" | "rparen"; pos: number };

const KEYWORDS = new Set(["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"]);
/** Loosest first; NOT (unary) binds tighter than all of them. */
const LEVELS: BinaryGate[][] = [
  ["OR", "NOR"],
  ["XOR", "XNOR"],
  ["AND", "NAND"],
];

class ExprError extends Error {}

/** Positions are 1-based character indexes, as a teacher would count them. */
function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "(" || ch === ")") {
      tokens.push({ kind: ch === "(" ? "lparen" : "rparen", pos: i + 1 });
      i++;
    } else if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z]/.test(src[j])) j++;
      const text = src.slice(i, j).toUpperCase();
      // Names are single letters, so any longer word must be an operator.
      if (text.length > 1 && !KEYWORDS.has(text)) {
        throw new ExprError(`${i + 1}-р тэмдэгтэд «${text}» гэсэн үг танигдсангүй.`);
      }
      tokens.push({ kind: "word", text, pos: i + 1 });
      i = j;
    } else {
      throw new ExprError(`${i + 1}-р тэмдэгт «${ch}» танигдсангүй.`);
    }
  }
  return tokens;
}

function show(t: Token): string {
  return t.kind === "word" ? t.text : t.kind === "lparen" ? "(" : ")";
}

export type ParsedExpr = { ok: true; expr: Expr } | { ok: false; message: string };

/** Parses a teacher's Boolean expression, e.g. "(A AND B) OR NOT C". */
export function parseExpression(src: string, inputs: string[]): ParsedExpr {
  try {
    const tokens = tokenize(src);
    if (tokens.length === 0) throw new ExprError("Илэрхийлэл хоосон байна.");
    let k = 0;

    const binary = (level: number): Expr => {
      if (level === LEVELS.length) return unary();
      let left = binary(level + 1);
      for (;;) {
        const t = tokens[k];
        if (t?.kind !== "word" || !(LEVELS[level] as string[]).includes(t.text)) return left;
        k++;
        left = { kind: "bin", op: t.text as BinaryGate, left, right: binary(level + 1) };
      }
    };
    const unary = (): Expr => {
      const t = tokens[k];
      if (t?.kind === "word" && t.text === "NOT") {
        k++;
        return { kind: "not", arg: unary() };
      }
      return primary();
    };
    const primary = (): Expr => {
      const t = tokens[k];
      if (!t) throw new ExprError("Илэрхийлэл дутуу байна.");
      if (t.kind === "lparen") {
        k++;
        const inner = binary(0);
        if (tokens[k]?.kind !== "rparen") {
          throw new ExprError(`${t.pos}-р тэмдэгтэд нээсэн хаалт хаагдаагүй байна.`);
        }
        k++;
        return inner;
      }
      if (t.kind === "rparen" || KEYWORDS.has(t.text)) {
        throw new ExprError(`${t.pos}-р тэмдэгтэд «${show(t)}» байх ёсгүй.`);
      }
      if (!inputs.includes(t.text)) throw new ExprError(`«${t.text}» гэсэн оролт алга.`);
      k++;
      return { kind: "var", name: t.text };
    };

    const expr = binary(0);
    const rest = tokens[k];
    if (rest) throw new ExprError(`${rest.pos}-р тэмдэгтэд «${show(rest)}» байх ёсгүй.`);
    return { ok: true, expr };
  } catch (err) {
    if (err instanceof ExprError) return { ok: false, message: err.message };
    throw err;
  }
}

export function evaluateExpr(expr: Expr, env: Record<string, Bit>): Bit {
  switch (expr.kind) {
    case "var":
      return env[expr.name];
    case "not":
      return applyGate("NOT", evaluateExpr(expr.arg, env), 0);
    case "bin":
      return applyGate(expr.op, evaluateExpr(expr.left, env), evaluateExpr(expr.right, env));
  }
}

export type ExprTable =
  | { ok: true; table: TruthTable }
  | { ok: false; errors: { output: string; message: string }[] };

/** One expression per output (in outputs order) → the expected truth table. */
export function expressionTable(
  exprs: string[],
  spec: Pick<LogicSpec, "inputs" | "outputs">
): ExprTable {
  const parsed = spec.outputs.map((output, i) => ({
    output,
    result: parseExpression(exprs[i] ?? "", spec.inputs),
  }));
  const errors = parsed.flatMap(({ output, result }) =>
    result.ok ? [] : [{ output, message: result.message }]
  );
  if (errors.length > 0) return { ok: false, errors };
  const exprList = parsed.map(({ result }) => (result as { ok: true; expr: Expr }).expr);

  const table = Array.from({ length: 2 ** spec.inputs.length }, (_, row) => {
    const bits = rowInputs(spec.inputs.length, row);
    const env = Object.fromEntries(spec.inputs.map((name, j) => [name, bits[j]]));
    return exprList.map((e) => String(evaluateExpr(e, env))).join("");
  });
  return { ok: true, table };
}
```

- [ ] **Step 4: Тест давахыг шалгах**

Run: `npx tsx --test src/lib/logic/expression.test.ts`
Expected: PASS — 5 тест, 0 fail.

- [ ] **Step 5: Checkpoint** — `npx tsc --noEmit` алдаагүй. Commit хийхгүй.

---

### Task 4: React Flow-той хөрвүүлэлт (`flow.ts`)

**Files:**
- Create: `src/lib/logic/flow.ts`
- Test: `src/lib/logic/flow.test.ts`

**Interfaces:**
- Consumes (Task 1–2): `GateType`, `LogicSpec`, `Circuit`, `inputId`, `outputId`.
- Produces:
  - `type FlowNodeData = { kind: "input"; name } | { kind: "output"; name } | { kind: "gate"; gate: GateType }`
  - `type FlowNodeType = "logicIn" | "logicOut" | "logicGate"`
  - `type FlowNode`, `type FlowEdge`, `TERMINAL_GAP = 90`, `OUTPUT_X = 640`
  - `edgeId(target, port) = "<target>#<port>"`
  - `terminalNodes(spec): FlowNode[]`, `circuitToFlow(circuit, spec): { nodes; edges }`, `flowToCircuit(nodes, edges): Circuit`, `nextGateId(nodes): string`

Node-ийн төрлийн нэр `logicIn`/`logicOut`/`logicGate` байна. React Flow-ийн өөрийн `input`/`output` төрөл нь анхдагч CSS-тэй (150px өргөн, хүрээ) тул тэдгээрээс зайлсхийнэ.

- [ ] **Step 1: Тест бичих**

`src/lib/logic/flow.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { GATE_TYPES } from "@/lib/logic/gates";
import type { Circuit } from "@/lib/logic/circuit";
import { circuitToFlow, flowToCircuit, nextGateId, terminalNodes } from "@/lib/logic/flow";
import type { LogicSpec } from "@/lib/logic/spec";

const spec: LogicSpec = {
  inputs: ["A", "B", "C"],
  outputs: ["Q"],
  allowed_gates: [...GATE_TYPES],
  max_gates: null,
  table_visible: true,
};

test("terminalNodes pins inputs left and outputs right, centred, and locked", () => {
  assert.deepEqual(
    terminalNodes(spec).map((n) => [n.id, n.type, n.position.x, n.position.y, n.draggable, n.deletable]),
    [
      ["in:A", "logicIn", 0, 0, false, false],
      ["in:B", "logicIn", 0, 90, false, false],
      ["in:C", "logicIn", 0, 180, false, false],
      ["out:Q", "logicOut", 640, 90, false, false],
    ]
  );
});

test("circuitToFlow and flowToCircuit round-trip", () => {
  const circuit: Circuit = {
    gates: [{ id: "g1", type: "AND", x: 200, y: 40 }],
    wires: [
      { from: "in:A", to: "g1", port: 0 },
      { from: "in:B", to: "g1", port: 1 },
      { from: "g1", to: "out:Q", port: 0 },
    ],
  };
  const { nodes, edges } = circuitToFlow(circuit, spec);
  assert.deepEqual(edges[1], { id: "g1#1", source: "in:B", sourceHandle: "out", target: "g1", targetHandle: "in1" });
  assert.deepEqual(nodes.find((n) => n.id === "g1")?.type, "logicGate");
  assert.deepEqual(flowToCircuit(nodes, edges), circuit);
});

test("circuitToFlow drops wires to terminals the spec no longer has and keeps disallowed gates", () => {
  const circuit: Circuit = {
    gates: [{ id: "g1", type: "XOR", x: 0, y: 0 }],
    wires: [
      { from: "in:Z", to: "g1", port: 0 },
      { from: "g1", to: "out:Q", port: 0 },
      { from: "g1", to: "out:Q", port: 0 },
    ],
  };
  const { nodes, edges } = circuitToFlow(circuit, { ...spec, allowed_gates: ["AND"] });
  assert.ok(nodes.some((n) => n.id === "g1"));
  assert.deepEqual(edges.map((e) => e.id), ["out:Q#0"]);
});

test("flowToCircuit rounds dragged positions", () => {
  const nodes = [{ id: "g1", position: { x: 10.6, y: -3.2 }, data: { kind: "gate" as const, gate: "OR" as const } }];
  assert.deepEqual(flowToCircuit(nodes, []).gates, [{ id: "g1", type: "OR", x: 11, y: -3 }]);
});

test("nextGateId continues after the highest g<number>", () => {
  assert.equal(nextGateId([{ id: "in:A" }, { id: "g2" }, { id: "g10" }, { id: "gx" }]), "g11");
  assert.equal(nextGateId([]), "g1");
});
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npx tsx --test src/lib/logic/flow.test.ts`
Expected: FAIL — `Cannot find module '@/lib/logic/flow'`.

- [ ] **Step 3: `flow.ts` бичих**

```ts
import type { GateType } from "@/lib/logic/gates";
import { inputId, outputId, type Circuit } from "@/lib/logic/circuit";
import type { LogicSpec } from "@/lib/logic/spec";

export type FlowNodeData =
  | { kind: "input"; name: string }
  | { kind: "output"; name: string }
  | { kind: "gate"; gate: GateType };

/** Not React Flow's built-in "input"/"output" types, which bring their own node CSS. */
export type FlowNodeType = "logicIn" | "logicOut" | "logicGate";

/** Structurally a React Flow Node<FlowNodeData> / Edge, without importing React Flow. */
export type FlowNode = {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
  draggable?: boolean;
  deletable?: boolean;
};

export type FlowEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export const TERMINAL_GAP = 90;
export const OUTPUT_X = 640;

/** One wire per gate input, so the input identifies the wire. */
export const edgeId = (target: string, port: number) => `${target}#${port}`;

/** Inputs down the left edge, outputs down the right, centred on each other. */
export function terminalNodes(spec: LogicSpec): FlowNode[] {
  const inputs: FlowNode[] = spec.inputs.map((name, i) => ({
    id: inputId(name),
    type: "logicIn",
    position: { x: 0, y: i * TERMINAL_GAP },
    data: { kind: "input", name },
    draggable: false,
    deletable: false,
  }));
  const offset = ((spec.inputs.length - spec.outputs.length) * TERMINAL_GAP) / 2;
  const outputs: FlowNode[] = spec.outputs.map((name, i) => ({
    id: outputId(name),
    type: "logicOut",
    position: { x: OUTPUT_X, y: offset + i * TERMINAL_GAP },
    data: { kind: "output", name },
    draggable: false,
    deletable: false,
  }));
  return [...inputs, ...outputs];
}

/**
 * A saved circuit as editor nodes and edges. Terminals always come from
 * the current spec: wires to terminals it no longer has are dropped, and
 * repeated wires into one input keep only the first.
 */
export function circuitToFlow(circuit: Circuit, spec: LogicSpec): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [
    ...terminalNodes(spec),
    ...circuit.gates.map((g): FlowNode => ({
      id: g.id,
      type: "logicGate",
      position: { x: g.x, y: g.y },
      data: { kind: "gate", gate: g.type },
    })),
  ];
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges: FlowEdge[] = [];
  for (const w of circuit.wires) {
    const id = edgeId(w.to, w.port);
    if (!ids.has(w.from) || !ids.has(w.to) || seen.has(id)) continue;
    seen.add(id);
    edges.push({ id, source: w.from, sourceHandle: "out", target: w.to, targetHandle: `in${w.port}` });
  }
  return { nodes, edges };
}

export function flowToCircuit(
  nodes: readonly { id: string; position: { x: number; y: number }; data: FlowNodeData }[],
  edges: readonly { source: string; target: string; targetHandle?: string | null }[]
): Circuit {
  return {
    gates: nodes.flatMap((n) =>
      n.data.kind === "gate"
        ? [{ id: n.id, type: n.data.gate, x: Math.round(n.position.x), y: Math.round(n.position.y) }]
        : []
    ),
    wires: edges.map((e) => ({
      from: e.source,
      to: e.target,
      port: Number(e.targetHandle?.slice(2) || 0),
    })),
  };
}

export function nextGateId(nodes: readonly { id: string }[]): string {
  let max = 0;
  for (const n of nodes) {
    const m = /^g(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `g${max + 1}`;
}
```

- [ ] **Step 4: Тест давахыг шалгах**

Run: `npx tsx --test src/lib/logic/flow.test.ts`
Expected: PASS — 5 тест, 0 fail.

- [ ] **Step 5: Checkpoint** — `npx tsc --noEmit` алдаагүй. Commit хийхгүй.

---

### Task 5: Өгөгдлийн сан, төрөл, шошго

**Files:**
- Modify: `src/lib/db/schema.ts`, `src/lib/types.ts`, `src/lib/db/challenges.ts`, `src/lib/db/contests.ts`, `src/lib/contest-actions.ts:145-156` (`kind: "python"`), `src/app/modules/[moduleId]/page.tsx:101`, `src/app/teacher/content/page.tsx:13-18`
- Create: `drizzle/0003_*.sql` (drizzle-kit үүсгэнэ)
- Test: `src/lib/db/challenges.test.ts`, `src/lib/db/contests.test.ts`

**Interfaces:**
- Consumes (Task 1): `LogicSpec`, `TruthTable`.
- Produces:
  - `ChallengeType` нь `"logic"`-ийг агуулна. `Challenge.logic_spec?: LogicSpec`, `ChallengePrivate.expected_table?: TruthTable`.
  - `type ContestProblemKind = "python" | "logic"`, `ContestProblem.kind: ContestProblemKind` (заавал), `ContestProblem.logic_spec?: LogicSpec`, `ContestProblemPrivate.expected_table?: TruthTable`.
  - `getChallenge` / `getProblem` хэзээ ч `expected_table` буцаахгүй.

- [ ] **Step 1: Одоогийн тестүүдийг шинэ хэлбэрт тохируулж, шинэ тест нэмэх**

`src/lib/db/challenges.test.ts`:
- 43–47-р мөрийг солих:

```ts
  assert.deepEqual(got, { ...coding, options: undefined, logic_spec: undefined });
  for (const secret of ["hidden_test_cases", "hint", "correct_answer_index", "expected_answer", "mark_scheme", "expected_table"]) {
```

- `getChallengePrivate returns the secret half` тестийн хүлээгдэж буй объектод `expected_table: undefined,` нэмэх (`mark_scheme: undefined,`-ийн дараа).
- Файлын төгсгөлд нэмэх:

```ts
const logic: Challenge = {
  id: "ch-and",
  module_id: "module-01",
  type: "logic",
  title: "AND",
  prompt: "Q = A AND B",
  xp_reward: 10,
  order: 2,
  logic_spec: {
    inputs: ["A", "B"],
    outputs: ["Q"],
    allowed_gates: ["AND"],
    max_gates: 1,
    table_visible: false,
  },
};

test("logic challenges keep the expected table private", async () => {
  await upsertChallenge(logic, { expected_table: ["0", "0", "0", "1"] });
  const got = await getChallenge("ch-and");
  assert.equal(got?.type, "logic");
  assert.deepEqual(got?.logic_spec, logic.logic_spec);
  assert.equal("expected_table" in (got as object), false);
  assert.deepEqual((await getChallengePrivate("ch-and"))?.expected_table, ["0", "0", "0", "1"]);
});
```

`src/lib/db/contests.test.ts`:
- `problem` fixture-д `kind: "python",` нэмэх (`points: 100,`-ийн дараа).
- 95–101-р мөрийг солих:

```ts
  assert.deepEqual(await getProblem(contest.id, "p1"), { ...problem, logic_spec: undefined });
  assert.deepEqual(await getProblemPrivate(contest.id, "p1"), {
    hidden_test_cases: [{ input: "5 5", expected_output: "10" }],
    expected_table: undefined,
  });
  await upsertProblem(contest.id, { ...problem, points: 50 }, { hidden_test_cases: [] });
  assert.equal((await getProblem(contest.id, "p1"))?.points, 50);
  assert.deepEqual(await getProblemPrivate(contest.id, "p1"), {
    hidden_test_cases: [],
    expected_table: undefined,
  });
```

- Файлын төгсгөлд нэмэх:

```ts
test("logic problems round-trip and keep the expected table private", async () => {
  await upsertContest(contest);
  const gates: ContestProblem = {
    id: "gates",
    title: "XOR",
    prompt: "p",
    order: 3,
    points: 100,
    kind: "logic",
    public_test_cases: [],
    logic_spec: {
      inputs: ["A", "B"],
      outputs: ["Q"],
      allowed_gates: ["AND", "OR", "NOT"],
      max_gates: 5,
      table_visible: true,
    },
  };
  await upsertProblem(contest.id, gates, { hidden_test_cases: [], expected_table: ["0", "1", "1", "0"] });
  const got = await getProblem(contest.id, "gates");
  assert.equal(got?.kind, "logic");
  assert.deepEqual(got?.logic_spec, gates.logic_spec);
  assert.equal("expected_table" in (got as object), false);
  assert.deepEqual((await getProblemPrivate(contest.id, "gates"))?.expected_table, ["0", "1", "1", "0"]);
});

test("the database rejects an unknown problem kind", async () => {
  await upsertContest(contest);
  await assert.rejects(
    upsertProblem(contest.id, { ...problem, kind: "java" as never }, { hidden_test_cases: [] })
  );
});
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npm test 2>&1 | tail -30`
Expected: FAIL. `tsc` нь `kind` / `logic_spec` байхгүй гэж алдаа өгнө, эсвэл DB-ийн тест `column "logic_spec" does not exist` гэж унана.

- [ ] **Step 3: Schema өөрчлөх** (`src/lib/db/schema.ts`)

- Type import-ийн доор нэмэх:

```ts
import type { LogicSpec, TruthTable } from "../logic/spec";
```

- `challenges`-ийн `has_hint: boolean("has_hint"),`-ийн доор нэмэх:

```ts
    logic_spec: jsonb("logic_spec").$type<LogicSpec>(),
```

- `challenges_type_check`-ийг солих:

```ts
    check("challenges_type_check", sql`${t.type} in ('mcq', 'tracing', 'coding', 'theory', 'logic')`),
```

- `challengeAnswers`-ийн `mark_scheme: text("mark_scheme"),`-ийн доор нэмэх:

```ts
  expected_table: jsonb("expected_table").$type<TruthTable>(),
```

- `contestProblems`-ийн `public_test_cases` мөрийн доор нэмэх:

```ts
    kind: text("kind").$type<"python" | "logic">().notNull().default("python"),
    logic_spec: jsonb("logic_spec").$type<LogicSpec>(),
```

  Мөн түүний callback-ийг солих:

```ts
  (t) => [
    primaryKey({ columns: [t.contest_id, t.id] }),
    check("contest_problems_kind_check", sql`${t.kind} in ('python', 'logic')`),
  ]
```

- `contestProblemAnswers`-ийн `hidden_test_cases` мөрийн доор нэмэх:

```ts
    expected_table: jsonb("expected_table").$type<TruthTable>(),
```

- [ ] **Step 4: Migration үүсгэж, dev DB-д хэрэглэх**

Run: `npm run db:generate`
Expected:
- `drizzle/0003_<нэр>.sql` үүснэ;
- түүнд `DROP CONSTRAINT "challenges_type_check"`, 5 `ADD COLUMN` (`logic_spec` ×2, `expected_table` ×2, `kind ... DEFAULT 'python' NOT NULL`), 2 `ADD CONSTRAINT` байна.

Файлыг уншиж, өөр хүснэгтэд хүрээгүйг шалгана.

Run: `npm run db:migrate`
Expected: алдаагүй дуусна.

- [ ] **Step 5: Төрлүүд** (`src/lib/types.ts`)

- Файлын эхэнд нэмэх:

```ts
import type { LogicSpec, TruthTable } from "@/lib/logic/spec";
```

- `export type ChallengeType = "mcq" | "tracing" | "coding" | "theory" | "logic";`
- `Challenge`-ийн `has_hint?: boolean;`-ийн доор нэмэх:

```ts
  /** logic — inputs, outputs and constraints; the expected table stays private. */
  logic_spec?: LogicSpec;
```

- `ChallengePrivate`-ийн `mark_scheme?: string;`-ийн доор нэмэх:

```ts
  /** logic — expected outputs, one row per input combination. */
  expected_table?: TruthTable;
```

- [ ] **Step 6: `src/lib/db/challenges.ts`**

- `toChallenge`-д `has_hint`-ийн доор: `logic_spec: r.logic_spec ?? undefined,`
- `toPrivate`-д `mark_scheme`-ийн доор: `expected_table: r.expected_table ?? undefined,`
- `upsertChallenge`-ийн `row`-д `has_hint`-ийн доор: `logic_spec: c.logic_spec ?? null,`
- `answers`-д `mark_scheme`-ийн доор: `expected_table: privateData.expected_table ?? null,`

- [ ] **Step 7: `src/lib/db/contests.ts`**

- Import нэмэх: `import type { LogicSpec, TruthTable } from "@/lib/logic/spec";`
- `ContestProblem`-ийн өмнө нэмэх:

```ts
/** "logic" problems are answered with a circuit instead of code. */
export type ContestProblemKind = "python" | "logic";
```

- `ContestProblem`-д `points`-ийн доор `kind: ContestProblemKind;`, төгсгөлд `logic_spec?: LogicSpec;` нэмэх.
- `ContestProblemPrivate`-д `expected_table?: TruthTable;` нэмэх.
- `toProblem`-д нэмэх:

```ts
    kind: r.kind,
    logic_spec: r.logic_spec ?? undefined,
```

- `getProblemPrivate`-ийг солих:

```ts
export async function getProblemPrivate(
  contestId: string,
  problemId: string
): Promise<ContestProblemPrivate | null> {
  const [row] = await getDb()
    .select({
      hidden_test_cases: contestProblemAnswers.hidden_test_cases,
      expected_table: contestProblemAnswers.expected_table,
    })
    .from(contestProblemAnswers)
    .where(
      and(
        eq(contestProblemAnswers.contest_id, contestId),
        eq(contestProblemAnswers.problem_id, problemId)
      )
    )
    .limit(1);
  return row
    ? { hidden_test_cases: row.hidden_test_cases, expected_table: row.expected_table ?? undefined }
    : null;
}
```

- `upsertProblem`:
  - `data`-д `kind: problem.kind, logic_spec: problem.logic_spec ?? null,` нэмэх.
  - answers insert-ийн `values`-д `expected_table: privateData.expected_table ?? null,` нэмэх.
  - `set`-ийг `{ hidden_test_cases: privateData.hidden_test_cases, expected_table: privateData.expected_table ?? null }` болгох.

- [ ] **Step 8: Build-ийг ногоон байлгах**

- `src/lib/contest-actions.ts`-ийн `upsertProblem(...)` дуудлагын problem объектод `kind: "python",` нэмэх (Task 8 энэ action-ийг бүхэлд нь солино).
- `src/app/modules/[moduleId]/page.tsx:101`-ийн объектод `logic: "Логик хэлхээ"` нэмэх:

```tsx
                              : { coding: "Кодын даалгавар", mcq: "Сонгох тест", tracing: "Код мөшгих", theory: "Онолын асуулт", logic: "Логик хэлхээ" }[ch.type]}
```

- `src/app/teacher/content/page.tsx`-ийн `TYPE_LABEL`-д `logic: "Хэлхээ",` нэмэх.

- [ ] **Step 9: Бүх тест давахыг шалгах**

Run: `npx tsc --noEmit && npm test 2>&1 | tail -8`
Expected: tsc алдаагүй. `# fail 0`. Тестийн тоо = өмнөх 86 + Task 1–4-ийн 39 + энэ task-ийн 3 = 128.

- [ ] **Step 10: Checkpoint** — Commit хийхгүй.

---

### Task 6: Серверийн шалгалт (модулийн болон тэмцээний submit)

**Files:**
- Modify: `src/app/api/challenges/[challengeId]/submit/route.ts`
- Modify: `src/app/api/contests/[contestId]/problems/[problemId]/submit/route.ts` (бүхэлд нь солино)

**Interfaces:**
- Consumes (Task 2, 5): `gradeLogic`, `LogicError`, `Challenge.logic_spec`, `ChallengePrivate.expected_table`, `ContestProblem.kind/logic_spec`, `ContestProblemPrivate.expected_table`.
- Produces:
  - `export interface LogicResultDto { correctRows: number; totalRows: number; errors?: LogicError[] }` (модулийн route-оос экспортлогдоно).
  - Модулийн хариу: одоогийн талбарууд + `logic?: LogicResultDto`.
  - Тэмцээний хариу: одоогийн талбарууд + `logic?: LogicResultDto`. Logic үед `results: []`.
  - Хүсэлт: модуль `{ circuit, mode: "submit" }`, тэмцээн `{ circuit }`.

Route-уудад unit тест байхгүй (NextAuth `auth()`-аас хамаарна). Логикийг `gradeLogic` (Task 2) тестээр, route-ийг Task 10-ийн хөтөч дээрх шалгалтаар баталгаажуулна.

- [ ] **Step 1: Модулийн route**

- Import нэмэх:

```ts
import { gradeLogic } from "@/lib/logic/grade";
import type { LogicError } from "@/lib/logic/evaluate";
```

- `TestResultDto`-ийн доор нэмэх:

```ts
/** Logic challenges: rows only — which rows were wrong is never sent. */
export interface LogicResultDto {
  correctRows: number;
  totalRows: number;
  /** Structural problems; the attempt still counts as failed. */
  errors?: LogicError[];
}
```

- `SubmitBody`-д `selfAssess`-ийн доор нэмэх:

```ts
  /** logic — the circuit JSON (untrusted). */
  circuit?: unknown;
```

- `Graded`-д `markScheme?: string;`-ийн доор `logic?: LogicResultDto;` нэмэх.
- `switch`-д `case "theory"`-ийн доор нэмэх:

```ts
    case "logic":
      graded = await gradeLogicChallenge(challenge, body);
      break;
```

- Эцсийн `NextResponse.json({...})`-д `markScheme: graded.markScheme,`-ийн доор `logic: graded.logic,` нэмэх.
- `gradeTheory`-ийн доор нэмэх:

```ts
async function gradeLogicChallenge(challenge: Challenge, body: SubmitBody): Promise<Graded> {
  const expected = (await getChallengePrivate(challenge.id))?.expected_table;
  if (!challenge.logic_spec || !expected) {
    return {
      passed: false,
      snapshot: "",
      errorResponse: NextResponse.json(
        { message: "Бодлогын тохиргоо дутуу байна. Багшдаа хэлнэ үү." },
        { status: 409 }
      ),
    };
  }
  const grade = gradeLogic(challenge.logic_spec, expected, body.circuit);
  if (grade.status === "malformed") return badRequest(grade.message);

  // Stored even when broken, so an unfinished circuit comes back next time.
  const snapshot = JSON.stringify(grade.circuit);
  if (grade.status === "invalid") {
    return {
      passed: false,
      snapshot,
      logic: { correctRows: 0, totalRows: expected.length, errors: grade.errors },
    };
  }
  return {
    passed: grade.correctRows === grade.totalRows,
    snapshot,
    logic: { correctRows: grade.correctRows, totalRows: grade.totalRows },
  };
}
```

- [ ] **Step 2: Тэмцээний route-ийг бүхэлд нь солих**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  applySubmissionScore,
  contestStatus,
  getContest,
  getParticipant,
  getProblem,
  getProblemPrivate,
} from "@/lib/db/contests";
import { getUserProfile } from "@/lib/db/users";
import { NotFoundError } from "@/lib/errors";
import { gradeLogic } from "@/lib/logic/grade";
import { gradePython } from "@/lib/piston";
import { isStaff } from "@/lib/types";
import type {
  LogicResultDto,
  TestResultDto,
} from "@/app/api/challenges/[challengeId]/submit/route";

// Sequential Piston runs can exceed Vercel's default function timeout.
export const maxDuration = 60;

const MAX_CODE_LENGTH = 20_000;
const COOLDOWN_MS = 5_000;
const lastSubmitAt = new Map<string, number>();

/** What one attempt earned, before it is scored. */
interface Attempt {
  stored: string;
  passedTests: number;
  totalTests: number;
  results: TestResultDto[];
  logic?: LogicResultDto;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string; problemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Нэвтрээгүй байна." }, { status: 401 });
  }
  const uid = session.user.id;

  const now = Date.now();
  if (now - (lastSubmitAt.get(uid) ?? 0) < COOLDOWN_MS) {
    return NextResponse.json(
      { message: "Хэт олон удаа илгээлээ — хэдэн секунд хүлээгээрэй." },
      { status: 429 }
    );
  }
  lastSubmitAt.set(uid, now);

  const { contestId, problemId } = await params;
  const body = (await req.json().catch(() => null)) as { code?: unknown; circuit?: unknown } | null;
  if (!body) {
    return NextResponse.json({ message: "Хүсэлт буруу байна." }, { status: 400 });
  }

  const contest = await getContest(contestId);
  if (!contest) {
    return NextResponse.json({ message: "Тэмцээн олдсонгүй." }, { status: 404 });
  }
  const problem = await getProblem(contestId, problemId);
  if (!problem) {
    return NextResponse.json({ message: "Бодлого олдсонгүй." }, { status: 404 });
  }

  const status = contestStatus(contest);
  const profile = await getUserProfile(uid);
  const staff = isStaff(profile?.role);
  const participant = await getParticipant(contestId, uid);

  // Staff may dry-run problems anytime; students need registration and
  // a running contest, checked server-side against server time.
  if (!staff) {
    if (!participant) {
      return NextResponse.json(
        { message: "Эхлээд тэмцээнд бүртгүүлнэ үү." },
        { status: 403 }
      );
    }
    if (status === "upcoming") {
      return NextResponse.json({ message: "Тэмцээн хараахан эхлээгүй." }, { status: 403 });
    }
    if (status === "finished") {
      return NextResponse.json({ message: "Тэмцээн дууссан — илгээх боломжгүй." }, { status: 403 });
    }
  }

  const priv = await getProblemPrivate(contestId, problemId);
  let attempt: Attempt;
  if (problem.kind === "logic") {
    const expected = priv?.expected_table;
    if (!problem.logic_spec || !expected) {
      return NextResponse.json(
        { message: "Бодлогын тохиргоо дутуу байна. Багшдаа хэлнэ үү." },
        { status: 409 }
      );
    }
    const grade = gradeLogic(problem.logic_spec, expected, body.circuit);
    if (grade.status === "malformed") {
      return NextResponse.json({ message: grade.message }, { status: 400 });
    }
    attempt =
      grade.status === "invalid"
        ? {
            stored: JSON.stringify(grade.circuit),
            passedTests: 0,
            totalTests: expected.length,
            results: [],
            logic: { correctRows: 0, totalRows: expected.length, errors: grade.errors },
          }
        : {
            stored: JSON.stringify(grade.circuit),
            passedTests: grade.correctRows,
            totalTests: grade.totalRows,
            results: [],
            logic: { correctRows: grade.correctRows, totalRows: grade.totalRows },
          };
  } else {
    const code = body.code;
    if (typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ message: "Код хоосон байна." }, { status: 400 });
    }
    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ message: "Код хэт урт байна." }, { status: 400 });
    }
    const allTests = [
      ...problem.public_test_cases.map((t) => ({ ...t, hidden: false })),
      ...(priv?.hidden_test_cases ?? []).map((t) => ({ ...t, hidden: true })),
    ];
    if (allTests.length === 0) {
      return NextResponse.json({ message: "Бодлогод тест алга." }, { status: 400 });
    }

    let graded;
    try {
      graded = await gradePython(code, allTests);
    } catch (err) {
      console.error("Piston execution failed:", err);
      return NextResponse.json(
        { message: "Код ажиллуулах сервертэй холбогдож чадсангүй. Дахин оролдоно уу." },
        { status: 502 }
      );
    }
    attempt = {
      stored: code,
      passedTests: graded.filter((g) => g.passed).length,
      totalTests: allTests.length,
      results: graded.map((g, i) => {
        const test = allTests[i];
        if (test.hidden) return { passed: g.passed, hidden: true };
        return {
          passed: g.passed,
          hidden: false,
          input: test.input,
          expected: test.expected_output,
          actual: g.actual,
          ...(g.error ? { error: g.error } : {}),
        };
      }),
    };
  }

  const score = Math.round((problem.points * attempt.passedTests) / attempt.totalTests);

  // Staff dry-runs (or staff who registered anyway) never affect the board.
  let bestScore = score;
  let improved = false;
  if (!staff && participant) {
    try {
      ({ bestScore, improved } = await applySubmissionScore({
        contestId,
        uid,
        problemId,
        score,
        code: attempt.stored,
        passedTests: attempt.passedTests,
        totalTests: attempt.totalTests,
      }));
    } catch (err) {
      // The contest (and its participants) was deleted while grading.
      if (err instanceof NotFoundError) {
        return NextResponse.json({ message: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  return NextResponse.json({
    results: attempt.results,
    passedTests: attempt.passedTests,
    totalTests: attempt.totalTests,
    score,
    bestScore,
    improved,
    maxPoints: problem.points,
    logic: attempt.logic,
  });
}
```

- [ ] **Step 3: Шалгах**

Run: `npx tsc --noEmit && npx eslint "src/app/api" && npm test 2>&1 | tail -5`
Expected: tsc алдаагүй, eslint 0 алдаа, `# fail 0`.

- [ ] **Step 4: Checkpoint** — Commit хийхгүй.

---

### Task 7: Сурагчийн editor ба ажлын талбар

**Files:**
- Install: `@xyflow/react@^12.12.0`
- Create: `src/components/logic/gate-symbol.tsx`, `src/components/logic/use-circuit.ts`, `src/components/logic/circuit-editor.tsx`, `src/components/logic/logic-constraints.tsx`, `src/components/logic/logic-solver.tsx`, `src/components/logic/logic-workspace.tsx`, `src/components/challenge/hint-box.tsx`
- Modify: `src/components/challenge/challenge-workspace.tsx`, `src/components/challenge/challenge-quiz.tsx:36`, `src/app/challenges/[challengeId]/page.tsx`, `src/app/contests/[contestId]/problems/[problemId]/page.tsx`

**Interfaces:**
- Consumes: Task 1–6-ийн бүх зүйл. `LogicResultDto` нь модулийн route-оос.
- Produces:
  - `GateSymbol({ type, className? })` (серверт ч ажиллана, hook-гүй);
  - `LogicSolver({ spec, expected, initialCircuit, target })`, `type SolverTarget`;
  - `LogicWorkspace(...)`, `LogicConstraints({ spec })`, `HintBox(...)`.

Next 16-ийн гадны CSS import-ийн дүрэм (`node_modules/next/dist/docs/01-app/01-getting-started/11-css.md` § External stylesheets): package-ийн CSS-ийг `app` доторх ямар ч component-оос import хийж болно. Энэ task-ийг эхлэхээс өмнө тэр хэсгийг уншина.

- [ ] **Step 1: React Flow суулгах**

Run: `npm install @xyflow/react@^12.12.0`
Expected: `package.json`-ийн dependencies-д `"@xyflow/react": "^12.12.0"` нэмэгдэнэ. Алдаагүй.

- [ ] **Step 2: `gate-symbol.tsx`**

```tsx
import type { GateType } from "@/lib/logic/gates";
import { cn } from "@/lib/utils";

/*
 * IB (ANSI distinctive-shape) symbols on a 60×40 grid: inputs enter at
 * y=12 and y=28 (NOT: y=20), the output leaves at y=20. No hooks, so it
 * renders in lessons (server) and in the editor (client).
 */
const AND_BODY = "M10 4 H28 A16 16 0 0 1 28 36 H10 Z";
const OR_BODY = "M8 4 Q22 4 34 11 Q41 15 44 20 Q41 25 34 29 Q22 36 8 36 Q16 20 8 4 Z";
const XOR_BODY = "M12 4 Q26 4 36 11 Q42 15 45 20 Q42 25 36 29 Q26 36 12 36 Q20 20 12 4 Z";
const XOR_BACK = "M6 4 Q14 20 6 36";
const NOT_BODY = "M12 6 L40 20 L12 34 Z";

interface Shape {
  body: string;
  extra?: string;
  /** x where the body ends at y=20. */
  tip: number;
  bubble?: boolean;
  /** x where the input stubs meet the body. */
  inputEnd: number;
}

const SHAPES: Record<GateType, Shape> = {
  AND: { body: AND_BODY, tip: 44, inputEnd: 10 },
  NAND: { body: AND_BODY, tip: 44, bubble: true, inputEnd: 10 },
  OR: { body: OR_BODY, tip: 44, inputEnd: 11 },
  NOR: { body: OR_BODY, tip: 44, bubble: true, inputEnd: 11 },
  XOR: { body: XOR_BODY, extra: XOR_BACK, tip: 45, inputEnd: 9 },
  XNOR: { body: XOR_BODY, extra: XOR_BACK, tip: 45, bubble: true, inputEnd: 9 },
  NOT: { body: NOT_BODY, tip: 40, bubble: true, inputEnd: 12 },
};

export function GateSymbol({ type, className }: { type: GateType; className?: string }) {
  const s = SHAPES[type];
  const ys = type === "NOT" ? [20] : [12, 28];
  const outStart = s.bubble ? s.tip + 7 : s.tip;
  return (
    <svg
      viewBox="0 0 60 40"
      className={cn("h-10 w-15", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      role="img"
      aria-label={`${type} хаалга`}
    >
      {ys.map((y) => (
        <line key={y} x1={0} y1={y} x2={s.inputEnd} y2={y} />
      ))}
      <path d={s.body} className="fill-background" />
      {s.extra && <path d={s.extra} />}
      {s.bubble && <circle cx={s.tip + 3.5} cy={20} r={3.5} className="fill-background" />}
      <line x1={outStart} y1={20} x2={60} y2={20} />
    </svg>
  );
}
```

- [ ] **Step 3: `use-circuit.ts`**

```ts
"use client";

import { useMemo, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import type { Circuit } from "@/lib/logic/circuit";
import { wouldCreateCycle } from "@/lib/logic/evaluate";
import {
  circuitToFlow,
  edgeId,
  flowToCircuit,
  nextGateId,
  terminalNodes,
  type FlowNodeData,
} from "@/lib/logic/flow";
import type { GateType } from "@/lib/logic/gates";
import { MAX_GATES, type LogicSpec } from "@/lib/logic/spec";

export type CircuitNode = Node<FlowNodeData>;

/** Editor state, lifted so the solver can read the circuit for Run/Submit. */
export function useCircuit(spec: LogicSpec, initial: Circuit | null) {
  const [start] = useState(() =>
    initial ? circuitToFlow(initial, spec) : { nodes: terminalNodes(spec), edges: [] }
  );
  const [nodes, setNodes] = useState<CircuitNode[]>(start.nodes);
  const [edges, setEdges] = useState<Edge[]>(start.edges);
  const circuit = useMemo(() => flowToCircuit(nodes, edges), [nodes, edges]);
  const gateCount = circuit.gates.length;
  const gateLimit = Math.min(spec.max_gates ?? MAX_GATES, MAX_GATES);

  function onNodesChange(changes: NodeChange<CircuitNode>[]) {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }

  function onEdgesChange(changes: EdgeChange[]) {
    setEdges((es) => applyEdgeChanges(changes, es));
  }

  function isValidConnection(c: Connection | Edge): boolean {
    return Boolean(c.source && c.target) && !wouldCreateCycle(circuit, c.source, c.target);
  }

  function onConnect(c: Connection) {
    if (!isValidConnection(c)) return;
    const port = Number(c.targetHandle?.slice(2) || 0);
    const id = edgeId(c.target, port);
    // One wire per input: a new wire replaces the old one.
    setEdges((es) => [
      ...es.filter((e) => e.id !== id),
      { id, source: c.source, sourceHandle: "out", target: c.target, targetHandle: `in${port}` },
    ]);
  }

  function addGate(gate: GateType, position: { x: number; y: number }) {
    if (gateCount >= gateLimit) return;
    setNodes((ns) => [
      ...ns,
      { id: nextGateId(ns), type: "logicGate", position, data: { kind: "gate", gate } },
    ]);
  }

  function deleteSelected() {
    const removed = new Set(
      nodes.filter((n) => n.selected && n.data.kind === "gate").map((n) => n.id)
    );
    setNodes((ns) => ns.filter((n) => !removed.has(n.id)));
    setEdges((es) =>
      es.filter((e) => !e.selected && !removed.has(e.source) && !removed.has(e.target))
    );
  }

  function clear() {
    setNodes(terminalNodes(spec));
    setEdges([]);
  }

  return {
    nodes,
    edges,
    circuit,
    gateCount,
    gateLimit,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addGate,
    deleteSelected,
    clear,
  };
}

export type CircuitState = ReturnType<typeof useCircuit>;
```

- [ ] **Step 4: `circuit-editor.tsx`**

```tsx
"use client";

import { createContext, useContext, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RotateCcw, Trash2 } from "lucide-react";
import { evaluateRow } from "@/lib/logic/evaluate";
import { gateArity, type Bit, type GateType } from "@/lib/logic/gates";
import type { LogicSpec } from "@/lib/logic/spec";
import { GateSymbol } from "@/components/logic/gate-symbol";
import type { CircuitNode, CircuitState } from "@/components/logic/use-circuit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorContextValue {
  signals: Map<string, Bit | null>;
  errorIds: ReadonlySet<string>;
  toggleInput: (name: string) => void;
}

const EditorContext = createContext<EditorContextValue>({
  signals: new Map(),
  errorIds: new Set(),
  toggleInput: () => {},
});

function InputNode({ id, data }: NodeProps<CircuitNode>) {
  const { signals, toggleInput } = useContext(EditorContext);
  if (data.kind !== "input") return null;
  const on = signals.get(id) === 1;
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm">
      <span className="font-mono text-sm font-bold">{data.name}</span>
      <button
        type="button"
        onClick={() => toggleInput(data.name)}
        className={cn(
          "nodrag w-8 rounded px-1 py-0.5 font-mono text-xs font-semibold",
          on ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
        )}
        aria-label={`${data.name} оролтыг солих`}
      >
        {on ? 1 : 0}
      </button>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function OutputNode({ id, data }: NodeProps<CircuitNode>) {
  const { signals } = useContext(EditorContext);
  if (data.kind !== "output") return null;
  const value = signals.get(id);
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm">
      <Handle type="target" position={Position.Left} id="in0" />
      <span
        className={cn(
          "size-4 rounded-full border",
          value === 1 ? "border-amber-500 bg-amber-400 shadow-[0_0_10px] shadow-amber-400" : "bg-muted"
        )}
        aria-hidden
      />
      <span className="font-mono text-sm font-bold">{data.name}</span>
      <span className="sr-only">{value === null || value === undefined ? "тодорхойгүй" : value}</span>
    </div>
  );
}

function GateNode({ id, data, selected }: NodeProps<CircuitNode>) {
  const { errorIds } = useContext(EditorContext);
  if (data.kind !== "gate") return null;
  return (
    <div
      className={cn(
        "relative",
        errorIds.has(id) ? "text-red-600" : selected ? "text-sky-600" : "text-foreground"
      )}
    >
      <GateSymbol type={data.gate} className="h-12 w-18" />
      {gateArity(data.gate) === 2 ? (
        <>
          <Handle type="target" position={Position.Left} id="in0" style={{ top: "30%" }} />
          <Handle type="target" position={Position.Left} id="in1" style={{ top: "70%" }} />
        </>
      ) : (
        <Handle type="target" position={Position.Left} id="in0" />
      )}
      <Handle type="source" position={Position.Right} id="out" />
      <span className="pointer-events-none absolute inset-x-0 -bottom-3.5 text-center font-mono text-[10px] text-muted-foreground">
        {data.gate}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = { logicIn: InputNode, logicOut: OutputNode, logicGate: GateNode };

/** Wire colour follows the live signal; selection keeps React Flow's own colour variable. */
function wireStyle(value: Bit | null | undefined): CSSProperties {
  return {
    "--xy-edge-stroke": value === 1 ? "#16a34a" : "#a1a1aa",
    "--xy-edge-stroke-width": value === 1 ? 2.5 : 2,
    strokeDasharray: value === 0 || value === 1 ? undefined : "4 4",
  } as CSSProperties;
}

export function CircuitEditor(props: {
  spec: LogicSpec;
  state: CircuitState;
  errorIds: ReadonlySet<string>;
}) {
  return (
    <ReactFlowProvider>
      <EditorCanvas {...props} />
    </ReactFlowProvider>
  );
}

function EditorCanvas({
  spec,
  state,
  errorIds,
}: {
  spec: LogicSpec;
  state: CircuitState;
  errorIds: ReadonlySet<string>;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [bits, setBits] = useState<Record<string, Bit>>({});
  const signals = useMemo(
    () => evaluateRow(state.circuit, spec, spec.inputs.map((n) => bits[n] ?? 0)),
    [state.circuit, spec, bits]
  );
  const context = useMemo<EditorContextValue>(
    () => ({
      signals,
      errorIds,
      toggleInput: (name) => setBits((b) => ({ ...b, [name]: b[name] === 1 ? 0 : 1 })),
    }),
    [signals, errorIds]
  );
  const edges = state.edges.map((e) => ({ ...e, style: wireStyle(signals.get(e.source)) }));
  const full = state.gateCount >= state.gateLimit;

  function add(gate: GateType) {
    const rect = wrapper.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 300, y: 100 };
    // Nudge each new gate so repeated clicks don't stack exactly.
    const nudge = (state.gateCount % 5) * 16;
    state.addGate(gate, { x: center.x - 36 + nudge, y: center.y - 24 + nudge });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/60 px-2 py-1.5">
        {spec.allowed_gates.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => add(g)}
            disabled={full}
            title={`${g} нэмэх`}
            className="flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
          >
            <GateSymbol type={g} className="h-5 w-7.5" />
            {g}
          </button>
        ))}
        <span className={cn("ml-auto text-xs", full ? "font-medium text-amber-700" : "text-muted-foreground")}>
          Хаалга: {state.gateCount}
          {spec.max_gates !== null ? ` / ${spec.max_gates}` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={state.deleteSelected}
          title="Сонгосныг устгах"
          aria-label="Сонгосныг устгах"
        >
          <Trash2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            if (confirm("Бүх хаалга, утсыг арилгах уу?")) state.clear();
          }}
          title="Цэвэрлэх"
          aria-label="Цэвэрлэх"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <div ref={wrapper} className="min-h-0 flex-1">
        <EditorContext value={context}>
          <ReactFlow
            nodes={state.nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={state.onNodesChange}
            onEdgesChange={state.onEdgesChange}
            onConnect={state.onConnect}
            isValidConnection={state.isValidConnection}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            style={{ "--xy-edge-stroke-selected": "#0284c7" } as CSSProperties}
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </EditorContext>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `logic-constraints.tsx`**

```tsx
import type { LogicSpec } from "@/lib/logic/spec";

/** The rules of a logic problem, shown beside its prompt. */
export function LogicConstraints({ spec }: { spec: LogicSpec }) {
  return (
    <ul className="mt-4 space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
      <li>
        Оролт: <b className="font-mono">{spec.inputs.join(", ")}</b> · Гаралт:{" "}
        <b className="font-mono">{spec.outputs.join(", ")}</b>
      </li>
      <li>
        Зөвшөөрөгдөх хаалга: <b className="font-mono">{spec.allowed_gates.join(", ")}</b>
      </li>
      {spec.max_gates !== null && (
        <li>
          Хаалганы дээд тоо: <b>{spec.max_gates}</b>
        </li>
      )}
      <li>Хүлээгдэж буй хүснэгт: {spec.table_visible ? "«Ажиллуулах» дарахад харагдана" : "нууц"}</li>
    </ul>
  );
}
```

- [ ] **Step 6: `logic-solver.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CheckCircle2, ChevronRight, Loader2, Play, Send, Table2 } from "lucide-react";
import type { Circuit } from "@/lib/logic/circuit";
import { truthTable, validateCircuit, type LogicError } from "@/lib/logic/evaluate";
import { rowInputs, type LogicSpec, type TruthTable } from "@/lib/logic/spec";
import { useCircuit } from "@/components/logic/use-circuit";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { LogicResultDto } from "@/app/api/challenges/[challengeId]/submit/route";

// React Flow measures the DOM, so the canvas renders on the client only.
const CircuitEditor = dynamic(
  () => import("@/components/logic/circuit-editor").then((m) => m.CircuitEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Editor ачаалж байна…
      </div>
    ),
  }
);

export type SolverTarget =
  | { kind: "challenge"; challengeId: string; alreadyPassed: boolean }
  | { kind: "contest"; contestId: string; problemId: string; disabled: boolean };

type Outcome =
  | { kind: "challenge"; xpAwarded: number; unlockedModule: { id: string; title: string } | null }
  | { kind: "contest"; score: number; bestScore: number; improved: boolean; maxPoints: number };

interface Graded {
  correctRows: number;
  totalRows: number;
  outcome: Outcome;
}

type PanelState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "message"; message: string }
  | { kind: "invalid"; errors: LogicError[] }
  | { kind: "table"; table: TruthTable; graded?: Graded };

interface SubmitResponse {
  message?: string;
  logic?: LogicResultDto;
  xpAwarded?: number;
  unlockedModule?: { id: string; title: string } | null;
  score?: number;
  bestScore?: number;
  improved?: boolean;
  maxPoints?: number;
}

export function LogicSolver({
  spec,
  expected,
  initialCircuit,
  target,
}: {
  spec: LogicSpec;
  /** Only when the problem shows its table; hidden tables never reach the client. */
  expected: TruthTable | null;
  initialCircuit: Circuit | null;
  target: SolverTarget;
}) {
  const state = useCircuit(spec, initialCircuit);
  const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
  const errorIds = useMemo(
    () => new Set(panel.kind === "invalid" ? panel.errors.flatMap((e) => e.gateIds ?? []) : []),
    [panel]
  );
  const busy = panel.kind === "busy";
  const locked = target.kind === "contest" && target.disabled;

  function run() {
    const errors = validateCircuit(state.circuit, spec);
    setPanel(
      errors.length > 0
        ? { kind: "invalid", errors }
        : { kind: "table", table: truthTable(state.circuit, spec) }
    );
  }

  async function submit() {
    const circuit = state.circuit;
    setPanel({ kind: "busy" });
    const url =
      target.kind === "challenge"
        ? `/api/challenges/${target.challengeId}/submit`
        : `/api/contests/${target.contestId}/problems/${target.problemId}/submit`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target.kind === "challenge" ? { circuit, mode: "submit" } : { circuit }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (!res.ok || !data.logic) {
        setPanel({ kind: "message", message: data.message ?? "Алдаа гарлаа. Дахин оролдоно уу." });
        return;
      }
      if (data.logic.errors?.length) {
        setPanel({ kind: "invalid", errors: data.logic.errors });
        return;
      }
      const outcome: Outcome =
        target.kind === "challenge"
          ? { kind: "challenge", xpAwarded: data.xpAwarded ?? 0, unlockedModule: data.unlockedModule ?? null }
          : {
              kind: "contest",
              score: data.score ?? 0,
              bestScore: data.bestScore ?? 0,
              improved: data.improved ?? false,
              maxPoints: data.maxPoints ?? 0,
            };
      setPanel({
        kind: "table",
        table: truthTable(circuit, spec),
        graded: { correctRows: data.logic.correctRows, totalRows: data.logic.totalRows, outcome },
      });
    } catch {
      setPanel({ kind: "message", message: "Сервертэй холбогдож чадсангүй." });
    }
  }

  return (
    <ResizablePanelGroup orientation="vertical" className="max-lg:flex-col!">
      <ResizablePanel defaultSize="62%" minSize="30%" className="max-lg:basis-auto!">
        <div className="flex h-full flex-col max-lg:h-[28rem]">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Хэлхээ</span>
            <div className="flex items-center gap-2">
              {target.kind === "challenge" && target.alreadyPassed && (
                <span className="mr-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="size-3.5" />
                  Бодсон
                </span>
              )}
              <Button onClick={run} disabled={busy} variant="outline" size="sm">
                <Play className="size-3.5" />
                Ажиллуулах
              </Button>
              <Button onClick={submit} disabled={busy || locked} size="sm">
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Илгээх
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <CircuitEditor spec={spec} state={state} errorIds={errorIds} />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="max-lg:hidden" />

      <ResizablePanel defaultSize="38%" minSize="15%" className="max-lg:basis-auto! max-lg:min-h-56">
        <ResultsPanel spec={spec} expected={expected} panel={panel} target={target} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function ResultsPanel({
  spec,
  expected,
  panel,
  target,
}: {
  spec: LogicSpec;
  expected: TruthTable | null;
  panel: PanelState;
  target: SolverTarget;
}) {
  return (
    <div className="flex h-full flex-col bg-background text-sm">
      <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <Table2 className="size-3.5" />
        Үр дүн
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {panel.kind === "idle" && (
          <p className="text-muted-foreground">
            «Ажиллуулах» — таны хэлхээний үнэний хүснэгт · «Илгээх» —{" "}
            {target.kind === "challenge" ? "шалгуулж XP авах" : "шалгуулж оноо авах"}
            {target.kind === "contest" && target.disabled && " (тэмцээн явагдаагүй байна)"}
          </p>
        )}
        {panel.kind === "busy" && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Шалгаж байна…
          </p>
        )}
        {panel.kind === "message" && <p className="text-destructive">✗ {panel.message}</p>}
        {panel.kind === "invalid" && (
          <ul className="space-y-1 text-destructive">
            {panel.errors.map((e) => (
              <li key={e.message}>✗ {e.message}</li>
            ))}
          </ul>
        )}
        {panel.kind === "table" && (
          <div className="space-y-3">
            {panel.graded && <GradedSummary graded={panel.graded} tableHidden={!expected} />}
            <TruthTableView spec={spec} table={panel.table} expected={expected} />
          </div>
        )}
      </div>
    </div>
  );
}

function GradedSummary({ graded, tableHidden }: { graded: Graded; tableHidden: boolean }) {
  const all = graded.correctRows === graded.totalRows;
  const { outcome } = graded;
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        all ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
      )}
    >
      <p className="font-medium">
        {graded.correctRows}/{graded.totalRows} мөр зөв
        {all && (outcome.kind === "challenge" ? " — бодлого биелэгдлээ!" : " — бүх мөр зөв!")}
      </p>
      {!all && tableHidden && (
        <p className="text-muted-foreground">
          Аль мөр буруу болохыг харуулахгүй. Хэлхээгээ дахин шалгаарай.
        </p>
      )}
      {outcome.kind === "challenge" && outcome.xpAwarded > 0 && (
        <p className="mt-1 font-medium text-emerald-700">🏆 +{outcome.xpAwarded} XP</p>
      )}
      {outcome.kind === "challenge" && outcome.unlockedModule && (
        <p className="mt-1 text-violet-700">
          🎉 Модуль дууслаа!{" "}
          <Link href={`/modules/${outcome.unlockedModule.id}`} className="underline underline-offset-4">
            «{outcome.unlockedModule.title}»
          </Link>{" "}
          нээгдлээ
          <ChevronRight className="inline size-3.5" />
        </p>
      )}
      {outcome.kind === "contest" && (
        <p className="mt-1">
          Оноо: <b>{outcome.score}</b> / {outcome.maxPoints}
          {outcome.improved ? " — шинэ дээд амжилт!" : ` (таны шилдэг: ${outcome.bestScore})`}
        </p>
      )}
    </div>
  );
}

function TruthTableView({
  spec,
  table,
  expected,
}: {
  spec: LogicSpec;
  table: TruthTable;
  expected: TruthTable | null;
}) {
  return (
    <table className="font-mono text-xs">
      <thead>
        <tr className="text-muted-foreground">
          {spec.inputs.map((n) => (
            <th key={n} className="px-2 py-1 text-center">{n}</th>
          ))}
          {spec.outputs.map((n, j) => (
            <th key={n} className={cn("px-2 py-1 text-center", j === 0 && "border-l")}>Таны {n}</th>
          ))}
          {expected &&
            spec.outputs.map((n, j) => (
              <th key={`e${n}`} className={cn("px-2 py-1 text-center", j === 0 && "border-l")}>
                Хүлээгдэж буй {n}
              </th>
            ))}
          {expected && <th className="px-2 py-1" />}
        </tr>
      </thead>
      <tbody>
        {table.map((row, i) => {
          const ok = expected ? row === expected[i] : null;
          return (
            <tr key={i} className={cn("border-t", ok === false && "bg-red-500/10")}>
              {rowInputs(spec.inputs.length, i).map((b, j) => (
                <td key={j} className="px-2 py-0.5 text-center">{b}</td>
              ))}
              {row.split("").map((b, j) => (
                <td key={`o${j}`} className={cn("px-2 py-0.5 text-center font-semibold", j === 0 && "border-l")}>
                  {b}
                </td>
              ))}
              {expected &&
                expected[i].split("").map((b, j) => (
                  <td key={`e${j}`} className={cn("px-2 py-0.5 text-center", j === 0 && "border-l")}>
                    {b}
                  </td>
                ))}
              {expected && (
                <td className={cn("px-2 py-0.5", ok ? "text-emerald-600" : "text-red-600")}>
                  {ok ? "✓" : "✗"}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 7: `hint-box.tsx` гаргаж авах**

`src/components/challenge/hint-box.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reveals a challenge's hint on request; the first reveal costs 30% of the XP. */
export function HintBox({
  challengeId,
  alreadyPassed,
  hintAlreadyUsed,
  onError,
}: {
  challengeId: string;
  alreadyPassed: boolean;
  hintAlreadyUsed: boolean;
  onError: (message: string) => void;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(hintAlreadyUsed);
  const [loading, setLoading] = useState(false);

  async function fetchHint() {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/hint`, { method: "POST" });
      const data = (await res.json()) as { hint?: string; message?: string };
      if (res.ok && data.hint) {
        setHint(data.hint);
        setHintUsed(true);
      } else {
        onError(data.message ?? "Hint авахад алдаа гарлаа.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {hint ? (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-amber-900 dark:text-amber-200">{hint}</p>
        </div>
      ) : (
        <Button onClick={fetchHint} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
          {alreadyPassed || hintUsed ? "Hint харах" : "Hint авах (−30% XP)"}
        </Button>
      )}
    </div>
  );
}
```

`src/components/challenge/challenge-workspace.tsx`-д:
- `hint`, `hintUsed`, `hintLoading` state болон `fetchHint` функцийг устгах.
- `{hasHint && (<div className="mt-6">…</div>)}` блокыг дараахаар солих:

```tsx
          {hasHint && (
            <HintBox
              challengeId={challengeId}
              alreadyPassed={alreadyPassed}
              hintAlreadyUsed={hintAlreadyUsed}
              onError={(message) => setTerminal({ kind: "error", message })}
            />
          )}
```

- `import { HintBox } from "@/components/challenge/hint-box";` нэмэх.
- lucide import-оос `Lightbulb`-ийг хасах (`Loader2` хэвээр үлдэнэ).

- [ ] **Step 8: `logic-workspace.tsx`**

```tsx
"use client";

import { useState, type ReactNode } from "react";
import type { Circuit } from "@/lib/logic/circuit";
import type { LogicSpec, TruthTable } from "@/lib/logic/spec";
import { HintBox } from "@/components/challenge/hint-box";
import { LogicConstraints } from "@/components/logic/logic-constraints";
import { LogicSolver } from "@/components/logic/logic-solver";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

/** Module challenge layout: prompt and hint on the left, the circuit on the right. */
export function LogicWorkspace({
  challengeId,
  spec,
  expected,
  initialCircuit,
  alreadyPassed,
  hasHint,
  hintAlreadyUsed,
  description,
}: {
  challengeId: string;
  spec: LogicSpec;
  expected: TruthTable | null;
  initialCircuit: Circuit | null;
  alreadyPassed: boolean;
  hasHint: boolean;
  hintAlreadyUsed: boolean;
  /** Server-rendered MDX prompt. */
  description: ReactNode;
}) {
  const [hintError, setHintError] = useState<string | null>(null);

  return (
    <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1 max-lg:flex-col!">
      <ResizablePanel defaultSize="36%" minSize="22%" className="max-lg:basis-auto!">
        <div className="h-full overflow-y-auto bg-background p-6">
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">{description}</div>
          <LogicConstraints spec={spec} />
          {hasHint && (
            <HintBox
              challengeId={challengeId}
              alreadyPassed={alreadyPassed}
              hintAlreadyUsed={hintAlreadyUsed}
              onError={setHintError}
            />
          )}
          {hintError && <p className="mt-2 text-sm text-destructive">{hintError}</p>}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="max-lg:hidden" />

      <ResizablePanel defaultSize="64%" minSize="35%" className="max-lg:basis-auto!">
        <LogicSolver
          spec={spec}
          expected={expected}
          initialCircuit={initialCircuit}
          target={{ kind: "challenge", challengeId, alreadyPassed }}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

- [ ] **Step 9: Бодлогын хуудас** (`src/app/challenges/[challengeId]/page.tsx`)

- Import-ууд:
  - `import { getChallenge, getChallengePrivate } from "@/lib/db/challenges";`
  - `import { isStaff, type Challenge } from "@/lib/types";`
  - `import { parseCircuit } from "@/lib/logic/circuit";`
  - `import { LogicWorkspace } from "@/components/logic/logic-workspace";`
- Coding layout-ийн `<header>…</header>` блокыг файлын төгсгөлд тусдаа component болгон гаргах:

```tsx
function WorkspaceHeader({ challenge }: { challenge: Challenge }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          render={<Link href={`/modules/${challenge.module_id}`} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="size-4" />
          <span className="max-sm:hidden">Хичээл</span>
        </Button>
        <span className="truncate font-semibold">{challenge.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Trophy className="size-4" />
          {challenge.xp_reward} XP
        </span>
        <UserMenu />
      </div>
    </header>
  );
}
```

  Coding салааны `{/* Compact workspace header */}<header>…</header>`-ийг `<WorkspaceHeader challenge={challenge} />`-ээр солих.

- `const submission = …` мөрийн доор, `// Non-coding challenges…`-ээс өмнө нэмэх:

```tsx
  if (challenge.type === "logic") {
    const spec = challenge.logic_spec;
    // The expected table leaves the server only when the problem shows it.
    const expected = spec?.table_visible
      ? ((await getChallengePrivate(challenge.id))?.expected_table ?? null)
      : null;
    const saved = submission?.code_snapshot ? parseCircuit(submission.code_snapshot) : null;
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <WorkspaceHeader challenge={challenge} />
        {spec ? (
          <LogicWorkspace
            challengeId={challenge.id}
            spec={spec}
            expected={expected}
            initialCircuit={saved?.ok ? saved.circuit : null}
            alreadyPassed={submission?.passed ?? false}
            hasHint={challenge.has_hint ?? false}
            hintAlreadyUsed={submission?.hint_used ?? false}
            description={
              <>
                <h1>{challenge.title}</h1>
                <MdxContent source={challenge.prompt} />
              </>
            }
          />
        ) : (
          <p className="p-6 text-sm text-destructive">Бодлогын тохиргоо дутуу байна.</p>
        )}
      </div>
    );
  }
```

- `src/components/challenge/challenge-quiz.tsx:36`-ийг `type: Exclude<ChallengeType, "coding" | "logic">;` болгох.

- [ ] **Step 10: Тэмцээний бодлогын хуудас**

`src/app/contests/[contestId]/problems/[problemId]/page.tsx`-д:
- `getProblemPrivate`-ийг `@/lib/db/contests`-ийн import-д нэмэх.
- Import нэмэх:

```tsx
import { LogicConstraints } from "@/components/logic/logic-constraints";
import { LogicSolver } from "@/components/logic/logic-solver";
```

- `const myScore = …`-ийн доор нэмэх:

```tsx
  const logicSpec = problem.kind === "logic" ? problem.logic_spec : undefined;
  const expected = logicSpec?.table_visible
    ? ((await getProblemPrivate(contestId, problem.id))?.expected_table ?? null)
    : null;
```

- Бодлогын card-ийн `<MdxContent …/>`-ийг агуулсан `div`-ийн доор (card дотор) `{logicSpec && <LogicConstraints spec={logicSpec} />}` нэмэх.
- `<ContestRunner …/>`-ийг дараахаар солих:

```tsx
        {problem.kind === "logic" ? (
          logicSpec ? (
            <div className="overflow-hidden rounded-lg border bg-background lg:h-[40rem]">
              <LogicSolver
                spec={logicSpec}
                expected={expected}
                initialCircuit={null}
                target={{
                  kind: "contest",
                  contestId,
                  problemId: problem.id,
                  disabled: !staff && status !== "running",
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-destructive">Бодлогын тохиргоо дутуу байна.</p>
          )
        ) : (
          <ContestRunner
            contestId={contestId}
            problemId={problem.id}
            initialCode={problem.starter_code ?? ""}
            disabled={!staff && status !== "running"}
          />
        )}
```

- [ ] **Step 11: Шалгах**

Run: `npx tsc --noEmit && npx eslint src/components/logic src/components/challenge "src/app/challenges" "src/app/contests" && npm test 2>&1 | tail -4`
Expected: tsc алдаагүй, eslint 0 алдаа, `# fail 0`.

- [ ] **Step 12: Хөтөч дээрх түргэн шалгалт** (бүрэн E2E нь Task 10)

- Dev server ажиллаж байх ёстой (`preview_start` → "dev", порт 3001).
- Staff бүртгэлээр Python-ы бодлого (жишээ нь `ch-01-sum`) нээж, hint товч болон ажиллуулах товч урьдынх шигээ ажиллаж байгааг шалгана.
- `read_console_messages` дээр шинэ алдаа байхгүй.

Logic бодлогын хуудас Task 9-ийн seed-ийн дараа л гарна.

- [ ] **Step 13: Checkpoint** — Commit хийхгүй.

---

### Task 8: Багшийн засварлагч

**Files:**
- Create: `src/components/teacher/logic-spec-fields.tsx`
- Modify: `src/components/teacher/challenge-form.tsx`, `src/components/teacher/contest-problem-form.tsx`, `src/lib/teacher-actions.ts`, `src/lib/contest-actions.ts`

**Interfaces:**
- Consumes: `parseLogicSpecJson`, `emptyTable`, `rowInputs`, `MAX_*`, `expressionTable`, `GATE_TYPES`, `GateSymbol`, `ContestProblemKind`.
- Produces:
  - формын талбарууд: `logic_spec` (JSON), `expected_table` (JSON), `kind` (зөвхөн тэмцээнд);
  - `saveChallenge` нь `type = "logic"`-ийг хүлээн авна;
  - `saveContestProblem` нь `kind = "logic"`-ийг хүлээн авна.

- [ ] **Step 1: `logic-spec-fields.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { expressionTable } from "@/lib/logic/expression";
import { GATE_TYPES, type GateType } from "@/lib/logic/gates";
import {
  emptyTable,
  MAX_GATES,
  MAX_INPUTS,
  MAX_OUTPUTS,
  rowInputs,
  type LogicSpec,
  type TruthTable,
} from "@/lib/logic/spec";
import { GateSymbol } from "@/components/logic/gate-symbol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const NEW_SPEC: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: [...GATE_TYPES],
  max_gates: null,
  table_visible: true,
};

/** "a, b c" → ["A", "B", "C"] */
function parseNames(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((s) => s.toUpperCase());
}

/**
 * Logic-problem settings for the challenge and contest forms. Everything
 * goes to the server as JSON in two hidden fields, and is re-validated there.
 */
export function LogicSpecFields({
  initialSpec,
  initialTable,
}: {
  initialSpec?: LogicSpec;
  initialTable?: TruthTable;
}) {
  const start = initialSpec ?? NEW_SPEC;
  const [inputsText, setInputsText] = useState(start.inputs.join(", "));
  const [outputsText, setOutputsText] = useState(start.outputs.join(", "));
  const [gates, setGates] = useState<GateType[]>(start.allowed_gates);
  const [maxGates, setMaxGates] = useState(start.max_gates === null ? "" : String(start.max_gates));
  const [tableVisible, setTableVisible] = useState(start.table_visible);
  const [table, setTable] = useState<TruthTable>(
    initialTable ?? emptyTable(start.inputs.length, start.outputs.length)
  );
  const [exprs, setExprs] = useState<Record<string, string>>({});
  const [exprErrors, setExprErrors] = useState<Record<string, string>>({});

  const inputs = parseNames(inputsText);
  const outputs = parseNames(outputsText);
  const sizeOk =
    inputs.length >= 1 && inputs.length <= MAX_INPUTS && outputs.length >= 1 && outputs.length <= MAX_OUTPUTS;
  // A table of the wrong shape (inputs/outputs changed) starts over as zeros.
  const fits = table.length === 2 ** inputs.length && table.every((r) => r.length === outputs.length);
  const current = sizeOk && !fits ? emptyTable(inputs.length, outputs.length) : table;

  const spec = {
    inputs,
    outputs,
    allowed_gates: GATE_TYPES.filter((g) => gates.includes(g)),
    max_gates: maxGates.trim() === "" ? null : Number(maxGates),
    table_visible: tableVisible,
  };

  function toggleGate(g: GateType) {
    setGates((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  }

  function toggleCell(row: number, col: number) {
    setTable(
      current.map((r, i) =>
        i === row ? r.slice(0, col) + (r[col] === "1" ? "0" : "1") + r.slice(col + 1) : r
      )
    );
  }

  function fillFromExpressions() {
    const result = expressionTable(outputs.map((o) => exprs[o] ?? ""), { inputs, outputs });
    if (result.ok) {
      setTable(result.table);
      setExprErrors({});
    } else {
      setExprErrors(Object.fromEntries(result.errors.map((e) => [e.output, e.message])));
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="logic_spec" value={JSON.stringify(spec)} />
      <input type="hidden" name="expected_table" value={JSON.stringify(current)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logic_inputs">Оролтууд</Label>
          <Input id="logic_inputs" value={inputsText} onChange={(e) => setInputsText(e.target.value)} placeholder="A, B, C" />
          <p className="text-xs text-muted-foreground">1–4 ширхэг, тус бүр нэг том латин үсэг.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="logic_outputs">Гаралтууд</Label>
          <Input id="logic_outputs" value={outputsText} onChange={(e) => setOutputsText(e.target.value)} placeholder="Q" />
          <p className="text-xs text-muted-foreground">1–4 ширхэг. Жишээ нь half adder: S, C.</p>
        </div>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Зөвшөөрөгдөх хаалгууд</legend>
        <div className="flex flex-wrap gap-2">
          {GATE_TYPES.map((g) => (
            <label
              key={g}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                gates.includes(g) ? "border-primary bg-primary/5" : "opacity-60"
              )}
            >
              <input type="checkbox" checked={gates.includes(g)} onChange={() => toggleGate(g)} className="size-3.5" />
              <GateSymbol type={g} className="h-5 w-7.5" />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logic_max">Хаалганы дээд тоо</Label>
          <Input
            id="logic_max"
            type="number"
            min={1}
            max={MAX_GATES}
            value={maxGates}
            onChange={(e) => setMaxGates(e.target.value)}
            placeholder="Хязгааргүй"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={tableVisible}
            onChange={(e) => setTableVisible(e.target.checked)}
            className="size-4"
          />
          Үнэний хүснэгтийг сурагчид харуулах
        </label>
      </div>

      {sizeOk ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Хүлээгдэж буй хүснэгт</p>
          <p className="text-xs text-muted-foreground">
            Илэрхийлэл бичээд «Хүснэгт бөглөх» дарна уу, эсвэл гаралтын нүд дээр дарж 0/1 болгож солино уу.
            Жишээ: (A AND B) OR NOT C
          </p>
          {outputs.map((o) => (
            <div key={o} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 font-mono text-sm font-semibold">{o} =</span>
                <Input
                  value={exprs[o] ?? ""}
                  onChange={(e) => setExprs((x) => ({ ...x, [o]: e.target.value }))}
                  placeholder="A AND B"
                  className="font-mono"
                  aria-label={`${o} гаралтын илэрхийлэл`}
                />
              </div>
              {exprErrors[o] && <p className="pl-12 text-xs text-destructive">{exprErrors[o]}</p>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={fillFromExpressions}>
            <Wand2 className="size-4" />
            Хүснэгт бөглөх
          </Button>
          <table className="font-mono text-sm">
            <thead>
              <tr>
                {inputs.map((n) => (
                  <th key={n} className="px-2 py-1">{n}</th>
                ))}
                {outputs.map((n, j) => (
                  <th key={n} className={cn("px-2 py-1", j === 0 && "border-l")}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map((row, i) => (
                <tr key={i} className="border-t">
                  {rowInputs(inputs.length, i).map((b, j) => (
                    <td key={j} className="px-2 py-0.5 text-center text-muted-foreground">{b}</td>
                  ))}
                  {row.split("").map((b, j) => (
                    <td key={`o${j}`} className={cn("px-1 py-0.5 text-center", j === 0 && "border-l")}>
                      <button
                        type="button"
                        onClick={() => toggleCell(i, j)}
                        className={cn("w-8 rounded font-semibold", b === "1" ? "bg-emerald-600 text-white" : "bg-muted")}
                        aria-label={`${i + 1}-р мөр, ${outputs[j]} = ${b}`}
                      >
                        {b}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-destructive">Оролт 1–4, гаралт 1–4 ширхэг байх ёстой.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Бодлогын форм ба `saveChallenge`**

`src/components/teacher/challenge-form.tsx`:
- `import { LogicSpecFields } from "@/components/teacher/logic-spec-fields";`
- `TYPES`-ийн төгсгөлд `{ value: "logic", label: "Логик хэлхээ (Gate)" },` нэмэх.
- `{type === "theory" && (…)}` блокийн доор нэмэх:

```tsx
      {type === "logic" && (
        <LogicSpecFields
          initialSpec={challenge?.logic_spec}
          initialTable={privateData?.expected_table}
        />
      )}
```

`src/lib/teacher-actions.ts`:
- `import { parseLogicSpecJson } from "@/lib/logic/spec";`
- `["coding", "mcq", "tracing", "theory"]`-г `["coding", "mcq", "tracing", "theory", "logic"]` болгох.
- `else if (type === "theory") {…}`-ийн доор нэмэх:

```ts
    } else if (type === "logic") {
      const parsed = parseLogicSpecJson(str(form, "logic_spec"), str(form, "expected_table"));
      if (!parsed.ok) return { error: parsed.errors.join(" ") };
      challenge.logic_spec = parsed.spec;
      privateData.expected_table = parsed.table;
```

- [ ] **Step 3: Тэмцээний бодлогын форм**

`src/components/teacher/contest-problem-form.tsx`:
- `import { useActionState, useState } from "react";`
- `import { LogicSpecFields } from "@/components/teacher/logic-spec-fields";`
- `import type { ContestProblem, ContestProblemKind, ContestProblemPrivate } from "@/lib/db/contests";`
- `useActionState`-ийн доор нэмэх: `const [kind, setKind] = useState<ContestProblemKind>(problem?.kind ?? "python");`
- Гарчгийн талбарын өмнө нэмэх:

```tsx
      <div className="space-y-1.5">
        <Label htmlFor="kind">Төрөл</Label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ContestProblemKind)}
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs"
        >
          <option value="python">Python код</option>
          <option value="logic">Логик хэлхээ (Gate)</option>
        </select>
      </div>
```

- Эхлэлийн кодын талбар болон хоёр `TestCaseEditor`-ийг дараахаар ороох:

```tsx
      {kind === "logic" ? (
        <LogicSpecFields initialSpec={problem?.logic_spec} initialTable={privateData?.expected_table} />
      ) : (
        <>
          {/* starter_code Textarea + public/hidden TestCaseEditor — unchanged */}
        </>
      )}
```

  Тайлбар мөрийн оронд одоо байгаа 3 элементийг өөрчлөлтгүйгээр оруулна.

`src/lib/contest-actions.ts`:
- `import { parseLogicSpecJson } from "@/lib/logic/spec";`
- `saveContestProblem`-ийн `const publicTests = …`-ээс `upsertProblem(...)` дуудлага хүртэлх хэсгийг солих:

```ts
    if (str(form, "kind") === "logic") {
      const parsed = parseLogicSpecJson(str(form, "logic_spec"), str(form, "expected_table"));
      if (!parsed.ok) return { error: parsed.errors.join(" ") };
      await upsertProblem(
        contestId,
        { id, title, prompt, points, order, kind: "logic", public_test_cases: [], logic_spec: parsed.spec },
        { hidden_test_cases: [], expected_table: parsed.table }
      );
    } else {
      const publicTests = parseTests(str(form, "public_tests"));
      const hiddenTests = parseTests(str(form, "hidden_tests"));
      if (publicTests.length + hiddenTests.length === 0) {
        return { error: "Дор хаяж нэг тест шаардлагатай." };
      }
      await upsertProblem(
        contestId,
        {
          id,
          title,
          prompt,
          points,
          order,
          kind: "python",
          starter_code: (form.get("starter_code") as string | null) ?? "",
          public_test_cases: publicTests,
        },
        { hidden_test_cases: hiddenTests }
      );
    }
```

- [ ] **Step 4: Шалгах**

Run: `npx tsc --noEmit && npx eslint src/components/teacher src/lib && npm test 2>&1 | tail -4`
Expected: tsc алдаагүй, eslint 0 алдаа, `# fail 0`.

- [ ] **Step 5: Хөтөч дээр шалгах (багш)**

1. Багшийн cookie-тэй (Task 10, алхам 1) `/teacher/content/challenge/new` нээнэ.
2. Төрөл = "Логик хэлхээ (Gate)" сонгоно.
3. `Q = A AND B` гэж бичээд "Хүснэгт бөглөх" дарна. Хүснэгт `0,0,0,1` болно.
4. Нэг нүд дарж 0↔1 солигдохыг шалгана.
5. Илэрхийлэл `A AND D` → "«D» гэсэн оролт алга." гарна.
6. Оролтыг `A, B, C` болгоход хүснэгт 8 мөр 0 болно.
7. ID `zz-logic-test`, модуль `module-07`, гарчиг, prompt бөглөөд хадгална. `/teacher/content` руу шилжинэ.
8. Засах хуудсыг дахин нээхэд spec болон хүснэгт сэргэнэ.
9. Устгах товчоор `zz-logic-test`-ийг устгана.

(`module-07` Task 9-ийн дараа л байх тул энэ алхмыг Task 9-ийн дараа хийж болно.)

- [ ] **Step 6: Checkpoint** — Commit хийхгүй.

---

### Task 9: Хичээл, жишээ бодлого, баримт бичиг

**Files:**
- Create: `src/components/logic/gate-table.tsx`, `content/modules/module-07.mdx`, `scripts/seed-logic.ts`
- Modify: `src/components/mdx/mdx-content.tsx`, `package.json` (`db:seed`), `README.md:65`

**Interfaces:**
- Consumes: `GATE_TYPES`, `applyGate`, `gateArity`, `GateSymbol`, `expressionTable`, `parseLogicSpec`, `rowInputs`, `upsertChallenge`.
- Produces: `<Gate type="…" />` ба `<GateTable />` MDX компонентууд; `module-07` модуль; `ch-logic-01…06` бодлогууд.

- [ ] **Step 1: `gate-table.tsx`**

```tsx
import { applyGate, GATE_TYPES, gateArity, type Bit, type GateType } from "@/lib/logic/gates";
import { GateSymbol } from "@/components/logic/gate-symbol";

const RULE: Record<GateType, string> = {
  AND: "Хоёр оролт хоёулаа 1 үед л 1.",
  OR: "Дор хаяж нэг оролт 1 бол 1.",
  NOT: "Оролтын эсрэг утга.",
  NAND: "AND-ийн эсрэг: хоёулаа 1 үед л 0.",
  NOR: "OR-ийн эсрэг: хоёулаа 0 үед л 1.",
  XOR: "Оролтууд ялгаатай үед 1.",
  XNOR: "Оролтууд ижил үед 1.",
};

const ONE: Bit[][] = [[0], [1]];
const TWO: Bit[][] = [[0, 0], [0, 1], [1, 0], [1, 1]];

/** Lesson reference: every gate's symbol, rule and truth table. */
export function GateTable() {
  return (
    <div className="not-prose my-4 grid gap-3 sm:grid-cols-2">
      {GATE_TYPES.map((type) => {
        const rows = gateArity(type) === 1 ? ONE : TWO;
        const names = gateArity(type) === 1 ? ["A"] : ["A", "B"];
        return (
          <div key={type} className="flex gap-4 rounded-lg border bg-background p-3">
            <div className="flex flex-col items-center gap-1">
              <GateSymbol type={type} className="h-12 w-18" />
              <span className="font-mono text-sm font-semibold">{type}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm">{RULE[type]}</p>
              <table className="font-mono text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    {names.map((n) => (
                      <th key={n} className="px-1.5">{n}</th>
                    ))}
                    <th className="border-l px-1.5">Q</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.join("")}>
                      {r.map((b, i) => (
                        <td key={i} className="px-1.5 text-center">{b}</td>
                      ))}
                      <td className="border-l px-1.5 text-center font-semibold">
                        {applyGate(type, r[0], r[1] ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: MDX-д бүртгэх** (`src/components/mdx/mdx-content.tsx`)

```tsx
import { GateSymbol } from "@/components/logic/gate-symbol";
import { GateTable } from "@/components/logic/gate-table";
import type { GateType } from "@/lib/logic/gates";

/** Inline gate symbol for lessons: <Gate type="NAND" /> */
function Gate({ type }: { type: GateType }) {
  return <GateSymbol type={type} className="inline-block h-8 w-12 align-middle" />;
}

const components = {
  Callout,
  Gate,
  GateTable,
};
```

- [ ] **Step 3: `content/modules/module-07.mdx`**

````mdx
---
module_id: module-07
syllabus_ref: "A1.2"
title: "Логик хаалга ба Boolean алгебр"
order: 7
description: "AND, OR, NOT, NAND, NOR, XOR, XNOR хаалга, үнэний хүснэгт, логик диаграм зурах."
---

# Логик хаалга ба Boolean алгебр

Компьютерийн бүх тооцоолол **0** ба **1** гэсэн хоёр утгатай дохион дээр хийгддэг. Ийм дохиог боловсруулдаг хамгийн жижиг хэсгийг **логик хаалга** (logic gate) гэнэ. CPU-ийн ALU хүртэл олон сая хаалганаас бүтдэг.

## Долоон хаалга

IB-ийн шалгалтад доорх 7 хаалгыг тэмдэгээр нь таньж, үнэний хүснэгтийг нь мэдэх шаардлагатай.

<GateTable />

<Callout type="info">
NAND болон NOR хаалгыг **universal** хаалга гэдэг. Бусад бүх хаалгыг зөвхөн NAND (эсвэл зөвхөн NOR) ашиглан бүтээж болно.
</Callout>

## Үнэний хүснэгт

Үнэний хүснэгт нь оролтуудын **бүх боломжит хослол** болон тэдгээрт харгалзах гаралтыг жагсаана. n оролттой хэлхээнд 2ⁿ мөр байна. Мөрүүдийг хоёртын тооллоор 000, 001, 010, … гэж дараалуулна.

| A | B | C | Q = (A AND B) OR NOT C |
|---|---|---|---|
| 0 | 0 | 0 | 1 |
| 0 | 0 | 1 | 0 |
| 0 | 1 | 0 | 1 |
| 0 | 1 | 1 | 0 |
| 1 | 0 | 0 | 1 |
| 1 | 0 | 1 | 0 |
| 1 | 1 | 0 | 1 |
| 1 | 1 | 1 | 1 |

## Үйлдлийн дараалал

Хаалтгүй бол эхлээд **NOT**, дараа нь **AND**, хамгийн сүүлд **OR** гүйцэтгэгдэнэ: `A OR B AND C` = `A OR (B AND C)`. Эргэлзээтэй үед хаалт хэрэглээрэй.

## Хэлхээний засварлагчийг ашиглах

1. Дээд мөрний хаалганы товч дээр дарж canvas дээр хаалга нэмээд, чирж байрлуулна.
2. Оролтын (A, B, …) эсвэл хаалганы **баруун талын цэгээс** дараагийн хаалганы **зүүн талын цэг** рүү чирж утас холбоно.
3. Оролтын **0/1** товчийг дарахад 1 утгатай утас ногоон болж, гаралтын гэрэл асна.
4. **Ажиллуулах** нь хэлхээний бүрэн үнэний хүснэгтийг гаргана. **Илгээх** нь хэлхээг шалгуулж, XP олгоно.
5. Утас эсвэл хаалгыг сонгоод **Delete** товчоор устгана.

## Дүгнэлт

- Логик хаалга нь 0/1 оролтоос нэг 0/1 гаралт гаргана
- n оролттой хэлхээний үнэний хүснэгт 2ⁿ мөртэй
- NAND, NOR нь universal хаалга
````

- [ ] **Step 4: `scripts/seed-logic.ts`**

```ts
/**
 * Seeds the logic-gate challenges of module-07. Run scripts/import-content.ts
 * first — challenges reference their module. Safe to re-run.
 * Run: npm run script -- scripts/seed-logic.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertChallenge } from "../src/lib/db/challenges";
import { expressionTable } from "../src/lib/logic/expression";
import { GATE_TYPES, type GateType } from "../src/lib/logic/gates";
import { parseLogicSpec, rowInputs, type LogicSpec, type TruthTable } from "../src/lib/logic/spec";

interface SeedLogic {
  id: string;
  title: string;
  prompt: string;
  xp: number;
  inputs: string[];
  outputs: string[];
  /** One Boolean expression per output; the expected table is computed from them. */
  exprs: string[];
  gates: readonly GateType[];
  max: number | null;
  visible: boolean;
  hint: string;
  /** Append the expected table to the prompt ("build it from the table" problems). */
  tableInPrompt?: boolean;
}

const BASIC: GateType[] = ["AND", "OR", "NOT"];

const problems: SeedLogic[] = [
  {
    id: "ch-logic-01",
    title: "Эхний хэлхээ: AND",
    prompt:
      "**A**, **B** оролттой, **Q** гаралттай хэлхээ зур: `Q = A AND B`.\n\nОролтуудаас AND хаалганы хоёр оролт руу, AND-ийн гаралтаас **Q** гэрэл рүү утас чирж холбоорой. Дараа нь оролтын 0/1 товчийг дарж гэрэл хэзээ асахыг ажиглаарай.",
    xp: 10,
    inputs: ["A", "B"],
    outputs: ["Q"],
    exprs: ["A AND B"],
    gates: GATE_TYPES,
    max: null,
    visible: true,
    hint: "AND хаалгыг нэмээд A, B-г түүний хоёр оролтод, гаралтыг нь Q-д холбоно.",
  },
  {
    id: "ch-logic-02",
    title: "Илэрхийллээс хэлхээ",
    prompt: "`Q = (A AND B) OR NOT C` илэрхийллийн логик диаграмыг зур.",
    xp: 15,
    inputs: ["A", "B", "C"],
    outputs: ["Q"],
    exprs: ["(A AND B) OR NOT C"],
    gates: BASIC,
    max: null,
    visible: false,
    hint: "Эхлээд A AND B, тусад нь NOT C хий. Дараа нь хоёуланг нь OR-оор нийлүүл.",
  },
  {
    id: "ch-logic-03",
    title: "Хүснэгтээс хэлхээ",
    prompt:
      "Үнэний хүснэгт нь доорх шиг байх хэлхээг AND, OR, NOT хаалгаар, **3-аас ихгүй** хаалга ашиглан зур.",
    xp: 15,
    inputs: ["A", "B", "C"],
    outputs: ["Q"],
    exprs: ["NOT A AND (B OR C)"],
    gates: BASIC,
    max: 3,
    visible: true,
    hint: "Q зөвхөн A = 0 үед 1 болж байна. Тэр үед B, C-ийн аль нэг нь 1 байх ёстой.",
    tableInPrompt: true,
  },
  {
    id: "ch-logic-04",
    title: "XOR-ыг үндсэн хаалгаар",
    prompt:
      "XOR хаалга ашиглахгүйгээр `Q = A XOR B` хэлхээг AND, OR, NOT хаалгаар (дээд тал нь **5** хаалга) бүтээ.",
    xp: 20,
    inputs: ["A", "B"],
    outputs: ["Q"],
    exprs: ["A XOR B"],
    gates: BASIC,
    max: 5,
    visible: true,
    hint: "A XOR B = (A AND NOT B) OR (NOT A AND B).",
  },
  {
    id: "ch-logic-05",
    title: "Зөвхөн NAND",
    prompt:
      "NAND бол **universal** хаалга: бусад бүх хаалгыг зөвхөн NAND-аар бүтээж болно. Зөвхөн **2 NAND** хаалгаар `Q = A AND B` хэлхээ зур.",
    xp: 20,
    inputs: ["A", "B"],
    outputs: ["Q"],
    exprs: ["A AND B"],
    gates: ["NAND"],
    max: 2,
    visible: true,
    hint: "NAND-ийн гаралтыг дараагийн NAND-ын хоёр оролтод зэрэг холбовол NOT болно.",
  },
  {
    id: "ch-logic-06",
    title: "Хагас нэмэгч (half adder)",
    prompt:
      "Хоёр битийг нэмдэг **хагас нэмэгч** зур. **A**, **B** нь нэмэгдэхүүн, **S** (sum) нь нийлбэрийн бит, **C** (carry) нь дараагийн орон руу шилжих бит.\n\nЖишээ нь 1 + 1 = 10₂ тул S = 0, C = 1.",
    xp: 25,
    inputs: ["A", "B"],
    outputs: ["S", "C"],
    exprs: ["A XOR B", "A AND B"],
    gates: GATE_TYPES,
    max: null,
    visible: false,
    hint: "S нь A, B ялгаатай үед 1. C нь хоёулаа 1 үед 1.",
  },
];

function markdownTable(spec: LogicSpec, table: TruthTable): string {
  const head = [...spec.inputs, ...spec.outputs];
  const lines = [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`];
  table.forEach((row, i) => {
    lines.push(`| ${[...rowInputs(spec.inputs.length, i), ...row.split("")].join(" | ")} |`);
  });
  return lines.join("\n");
}

async function main() {
  for (const [i, p] of problems.entries()) {
    const computed = expressionTable(p.exprs, { inputs: p.inputs, outputs: p.outputs });
    if (!computed.ok) throw new Error(`${p.id}: ${computed.errors.map((e) => e.message).join(" ")}`);
    const parsed = parseLogicSpec(
      {
        inputs: p.inputs,
        outputs: p.outputs,
        allowed_gates: [...p.gates],
        max_gates: p.max,
        table_visible: p.visible,
      },
      computed.table
    );
    if (!parsed.ok) throw new Error(`${p.id}: ${parsed.errors.join(" ")}`);

    await upsertChallenge(
      {
        id: p.id,
        module_id: "module-07",
        type: "logic",
        title: p.title,
        prompt: p.tableInPrompt ? `${p.prompt}\n\n${markdownTable(parsed.spec, parsed.table)}` : p.prompt,
        xp_reward: p.xp,
        order: i + 1,
        logic_spec: parsed.spec,
        has_hint: true,
      },
      { expected_table: parsed.table, hint: p.hint }
    );
    console.log("seeded", p.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 5: `package.json` болон README**

- `package.json`-ийн `db:seed`-ийн төгсгөлд ` && npm run script -- scripts/seed-logic.ts` нэмэх.
- `README.md:65` ("**Даалгавар**" мөр)-ийг дараахаар солих:

```md
- **Даалгавар**: `scripts/seed-challenges.ts`-д нэмээд `npm run db:seed`-ийг дахин ажиллуулна. Төрлүүд: `coding` (Piston тест), `mcq`, `tracing`, `theory` (mark scheme + өөрийн үнэлгээ), `logic` (логик хаалгаар хэлхээ зурах; жишээнүүд `scripts/seed-logic.ts`-д). Нууц тест, зөв хариулт, hint, mark scheme, хүлээгдэж буй үнэний хүснэгт нь `challenge_answers` хүснэгтэд хадгалагдана. Эдгээр нь клиент рүү хэзээ ч илгээгдэхгүй (logic бодлогын хүснэгтийг зөвхөн "харуулах" гэж тохируулсан үед).
```

- [ ] **Step 6: Контент оруулах**

Run: `npm run script -- scripts/import-content.ts && npm run script -- scripts/seed-logic.ts`
Expected: `module-07` импортлогдоно, `seeded ch-logic-01` … `seeded ch-logic-06` гарна.

Run: `docker exec coding-db psql -U coding -d coding -tAc "select id, type, (logic_spec->>'max_gates') from challenges where module_id='module-07' order by \"order\";"`
Expected: 6 мөр. `max_gates` нь 3-р бодлогод `3`, 4-т `5`, 5-д `2`, бусдад хоосон.

- [ ] **Step 7: Шалгах**

Run: `npx tsc --noEmit && npx eslint src/components scripts && npm test 2>&1 | tail -4`
Expected: tsc алдаагүй, eslint 0 алдаа, `# fail 0`.

- [ ] **Step 8: Checkpoint** — Commit хийхгүй.

---

### Task 10: Хөтөч дээрх бүрэн шалгалт ба эцсийн шалгалтууд

**Files:** Код өөрчлөхгүй. Алдаа олдвол тухайн task-ийн файлд засаж, тестээр баталгаажуулна.

- [ ] **Step 1: Бэлтгэл**

1. `npm run db:up`, `npm run db:migrate`.
2. Dev server (`preview_start` → "dev", http://localhost:3001).
3. Багшийн cookie үүсгэх: `npm run script -- scripts/make-test-session.ts --teacher`. Гаралтыг **чатад бичихгүй**.
4. Хөтөч дээр `document.cookie = "authjs.session-token=<утга>; path=/"` гэж тохируулна.

- [ ] **Step 2: Хичээл**

- `/modules/module-07` нээхэд `<GateTable>` 7 хаалгыг IB дүрс болон үнэний хүснэгттэй харуулна.
- 6 бодлого "Логик хэлхээ" шошготой харагдана.

- [ ] **Step 3: 1-р бодлого (`/challenges/ch-logic-01`)**

1. AND товч дарахад canvas дээр хаалга гарна. "Хаалга: 1" гэж харагдана.
2. `in:A → g1.in0`, `in:B → g1.in1`, `g1 → out:Q` утсуудыг чирж холбоно.
3. A, B унтраалгыг 1 болгоход утас ногоон болж, Q гэрэл асна. Нэгийг нь 0 болгоход гэрэл унтарна.
4. "Ажиллуулах" дарахад 4 мөрт хүснэгт гарч, бүх мөр ✓ байна.
5. Утсыг устгаад "Ажиллуулах" дарахад "AND хаалганы оролт холбогдоогүй байна." гарч, хаалга улаан болно.
6. Эхлээд OR-оор буруу хэлхээ илгээхэд "2/4 мөр зөв" гарна. Дараа нь AND-аар илгээхэд "4/4 мөр зөв — бодлого биелэгдлээ!" гарна.
7. Хуудсыг дахин ачаалахад сүүлд илгээсэн хэлхээ сэргэнэ.

- [ ] **Step 4: Хязгаарлалт ба алдаа**

- `ch-logic-05`-д palette-д зөвхөн NAND байна. 2 NAND нэмсний дараа товч идэвхгүй болж "Хаалга: 2 / 2" гэж харагдана.
- `ch-logic-04`-д NOT → NOT → эхний NOT руу утас холбох оролдлого (гогцоо) хүлээж авагдахгүй.

- [ ] **Step 5: Нууц хүснэгт алдагдахгүй байх**

`/challenges/ch-logic-02`-д `javascript_tool`:

```js
const html = await (await fetch(location.href)).text();
[html.includes('"expected_table"'), html.includes('["1","0","1","0","1","0","1","1"]'), html.includes('"expected"')]
```

Expected:
- эхний хоёр нь `false`;
- `ch-logic-01` дээр ижил шалгалт хийхэд хүлээгдэж буй хүснэгт (`["0","0","0","1"]`) хуудсанд байна (харагдах бодлого).

- [ ] **Step 6: Hint ба XP (сурагч)**

1. Cookie-г сурагчийнхаар солино: `npm run script -- scripts/make-test-session.ts` (ижил UID, эрх нь student болно).
2. `module-07`-ийг нээж өгнө:

   `npx tsx --env-file=.env.local --conditions=react-server -e "import('./src/lib/db/users.ts').then(async (u) => { await u.unlockModule('ui-test-student', 'module-07'); const c = await import('./src/lib/db/client.ts'); await c.closeDb(); })"`

3. `ch-logic-06`-д "Hint авах (−30% XP)" дарахад hint гарна.
4. Зөв half adder илгээхэд XP нь 25 × 0.7 ≈ 18 болно.
5. Python-ы бодлогын hint болон ажиллуулах товч (HintBox-ийг гаргаж авсан тул) урьдын адил ажиллана.

- [ ] **Step 7: Багшийн засварлагч**

Task 8-ийн алхам 5-ыг хийнэ (багшийн cookie).

- [ ] **Step 8: Тэмцээн**

1. Багшаар `/teacher/contests` → шинэ тэмцээн үүсгэнэ: `zz-gate-cup`, одооноос 1 цагийн өмнө эхэлж, 1 цагийн дараа дуусна.
2. Бодлого нэмнэ: Төрөл = "Логик хэлхээ", `Q = A XOR B`, хүснэгт харагдана, 100 оноо.
3. Сурагч болж бүртгүүлнэ.
4. Хагас зөв хэлхээ (OR, 3/4 мөр) илгээхэд "Оноо: 75 / 100 — шинэ дээд амжилт!" гарна. Зөв хэлхээ илгээхэд 100 болно.
5. Leaderboard дээр 100 оноо харагдана.
6. Багшаар тэмцээнийг устгана.

- [ ] **Step 9: Утасны өргөн**

`resize_window` → mobile (375×812):
- `/challenges/ch-logic-01` дээр canvas харагдаж (өндөр > 0), хаалга нэмж болно;
- хуудас хэвтээ чиглэлд гүйлгэгдэхгүй.

Дараа нь `resize_window` → desktop.

- [ ] **Step 10: Цэвэрлэх**

- `npm run script -- scripts/make-test-session.ts --cleanup`
- Хөтөчөөс cookie-г устгана.
- `docker exec coding-db psql -U coding -d coding -tAc "select count(*) from users;"` → `0`.

- [ ] **Step 11: Эцсийн шалгалтууд**

Run: `npm test 2>&1 | tail -6; npx tsc --noEmit; npm run lint 2>&1 | tail -3; npm run build 2>&1 | tail -15`
Expected:
- `# fail 0` (128 тест);
- tsc алдаагүй;
- lint 0 алдаа (өмнөх 2 `_form` анхааруулга);
- build амжилттай, `/challenges/[challengeId]` болон тэмцээний хуудас алдаагүй.

- [ ] **Step 12: Checkpoint** — Commit хийхгүй. "final code" гэж хэлэхийг хүлээнэ.
