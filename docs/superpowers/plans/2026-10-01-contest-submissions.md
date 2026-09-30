# Contest Submissions (teacher view, CSV, copy detection) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can browse every contest attempt, download results/attempts as CSV, and see pairs of suspiciously similar best answers per problem.

**Architecture:** Read-only feature over the existing append-only `contest_submissions` table — no schema change. Pure, unit-tested modules do the work (CSV, date format, Python winnowing fingerprints, circuit shapes, circuit → formula, pair finding, CSV builders, query parsing); a thin data layer adds three queries; one server-rendered teacher page with two tabs and one CSV route handler put it on screen.

**Tech Stack:** Next.js 16.2 App Router (server components, route handlers), Drizzle 0.45 + Postgres, `node:test` via tsx, Tailwind v4, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-01-contest-submissions-design.md`

## Global Constraints

- **Next.js 16:** before writing the page or the route handler, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and `…/route.md`. `params` and `searchParams` are Promises and must be awaited.
- **No schema changes, no migrations, no new npm dependencies.**
- **Text:**
  - UI text is Mongolian, exactly as written in this plan.
  - Code comments are English and sparse, matching the repo.
- **Staff check:** use the existing pattern: `auth()`, then `getUserProfile(uid)`, then `isStaff(profile?.role)`.
  - Pages: not signed in → `redirect("/login")`; not staff → `redirect("/")`.
  - Route handler: 401 when not signed in, 403 when not staff.
- **Similarity constants:** `K = 5`, `W = 4`, `MIN_TOKENS = 15`, circuit `DEPTH = 3`, `MIN_GATES = 2`, `SIMILARITY_THRESHOLD = 0.7`, `MAX_PAIRS = 50`. Badge colours use the rounded percent: ≥ 90 red, 70–89 amber.
- **Paging:** 100 rows per page.
- **Time format:** `YYYY-MM-DD HH:mm:ss` in `Asia/Ulaanbaatar`.
- **CSV:**
  - Every text cell is quoted, inner quotes are doubled, and rows end with CRLF.
  - Text starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`.
  - The route prepends the UTF-8 BOM `﻿`.
  - Filenames are `<contestId>-dun.csv` and `<contestId>-oroldlogo.csv`.
- **Tests:**
  - Single file: `npx tsx --env-file=.env.local --conditions=react-server --test <file>`.
  - Whole suite: `npm test`, which migrates `coding_test` first. DB tests need Docker's `coding-db` running (`npm run db:up`).
- **Do NOT commit.** The project rule is that commits and pushes happen only when the user says "final code". Leave all work uncommitted and record each task's completion in the ledger with its test command.
- **Do not touch:** the `shineue-db` container, port 5432, and `.env.local`.

## Review Focus

1. **Participant without a name** (`name` null): every view and CSV shows the email instead of an empty cell. Tested in Task 7 (`resultsCsv`, `attemptsCsv`).
2. **Empty contest** (no participants, no attempts): the CSVs contain the header only, and the pair finder returns nothing. Tested in Task 7 (`resultsCsv` with []) and Task 5 (`findSimilarPairs` with []).
3. **Stored circuit that no longer parses:** the CSV answer, the answer view and the pair finder must not throw. Tested in Task 7 (`answerText`) and Task 5 (malformed circuit is skipped).
4. **Junk query parameters** (`?page=-3`, `?page=abc`, unknown student or problem, repeated params): the page falls back to "all" and page 1. Tested in Task 8 (`parseSubmissionsQuery`).
5. **Very long code on a phone:** `<pre>` scrolls inside its box and never widens the page. Checked in the Task 8 browser step at 375px width.

---

### Task 1: CSV and date-time helpers

**Files:**
- Create: `src/lib/csv.ts`, `src/lib/csv.test.ts`
- Create: `src/lib/datetime.ts`, `src/lib/datetime.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `toCsv(rows: readonly (readonly (string | number)[])[]): string` and `formatDateTime(ms: number): string`.

- [ ] **Step 1: Write the failing tests**

`src/lib/csv.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "@/lib/csv";

test("toCsv quotes every text cell and doubles inner quotes", () => {
  assert.equal(toCsv([["Нэр", "Оноо"], ['Бат "Б"', 90]]), '"Нэр","Оноо"\r\n"Бат ""Б""",90\r\n');
});

test("toCsv keeps line breaks inside a quoted cell", () => {
  assert.equal(toCsv([["a\nb", 1]]), '"a\nb",1\r\n');
});

test("toCsv defuses text that Excel would run as a formula", () => {
  assert.equal(
    toCsv([["=1+1", "+x", "-y", "@z", "\tq", "ok"]]),
    `"'=1+1","'+x","'-y","'@z","'\tq","ok"\r\n`
  );
  assert.equal(toCsv([[-5]]), "-5\r\n");
});

test("toCsv of no rows is empty", () => {
  assert.equal(toCsv([]), "");
});
```

`src/lib/datetime.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDateTime } from "@/lib/datetime";

test("formatDateTime shows Ulaanbaatar time as YYYY-MM-DD HH:mm:ss", () => {
  assert.equal(formatDateTime(Date.parse("2026-03-01T09:05:07Z")), "2026-03-01 17:05:07");
});

test("formatDateTime moves past midnight into the next day", () => {
  assert.equal(formatDateTime(Date.parse("2026-03-01T20:00:00Z")), "2026-03-02 04:00:00");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --conditions=react-server --test src/lib/csv.test.ts src/lib/datetime.test.ts`
Expected: FAIL with `Cannot find module '@/lib/csv'` / `'@/lib/datetime'`.

- [ ] **Step 3: Implement**

`src/lib/csv.ts`:

```ts
/** Cells starting with these run as formulas when Excel opens the file. */
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** RFC 4180 rows with CRLF line ends. The UTF-8 BOM is the caller's to add. */
export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map((row) => row.map(cell).join(",") + "\r\n").join("");
}
```

`src/lib/datetime.ts`:

```ts
const FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** "2026-03-01 17:05:07" in school time. */
export function formatDateTime(ms: number): string {
  const part = Object.fromEntries(
    FORMAT.formatToParts(new Date(ms)).map((p) => [p.type, p.value])
  );
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --conditions=react-server --test src/lib/csv.test.ts src/lib/datetime.test.ts`
Expected: PASS, 6/6.

---

### Task 2: Python fingerprints

**Files:**
- Create: `src/lib/plagiarism/python.ts`
- Test: `src/lib/plagiarism/python.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `pythonTokens(code: string): string[]`
  - `fingerprints(tokens: readonly string[]): Set<number>`
  - `starterFingerprints(code: string | undefined): Set<number>`
  - `preparePython(code: string, starter: ReadonlySet<number>): Set<number> | null`
  - `comparePython(a: ReadonlySet<number>, b: ReadonlySet<number>): number`
  - `MIN_TOKENS = 15`

- [ ] **Step 1: Write the failing test**

`src/lib/plagiarism/python.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_TOKENS,
  comparePython,
  fingerprints,
  preparePython,
  pythonTokens,
  starterFingerprints,
} from "@/lib/plagiarism/python";

const ORIGINAL = `n = int(input())
total = 0
for i in range(n):
    x = int(input())
    if x % 2 == 0:
        total += x
print(total)
`;
const RENAMED = `# my solution
count = int(input())
s = 0
for k in range(count):
    v = int(input())   # read one
    if v % 2 == 0:
        s += v

print(s)
`;
const PADDED = `${RENAMED}
def helper(a):
    return a * 2

extra = [helper(i) for i in range(3)]
print("done", extra)
`;
const UNRELATED = `word = input()
if word == word[::-1]:
    print("YES")
else:
    print("NO")
`;
const OTHER_WAY = `n = int(input())
nums = [int(input()) for _ in range(n)]
print(sum(x for x in nums if x % 2 == 0))
`;
const WHILE_WAY = `n = int(input())
total = 0
i = 0
while i < n:
    v = int(input())
    if v % 2 == 0:
        total = total + v
    i += 1
print(total)
`;
const STARTER = `def solve(numbers):
    # write your code here
    return 0

n = int(input())
numbers = [int(input()) for _ in range(n)]
print(solve(numbers))
`;
const SUM_POSITIVE = STARTER.replace("return 0", "return sum(x for x in numbers if x > 0)");
const LARGEST = STARTER.replace(
  "return 0",
  "best = numbers[0]\n    for x in numbers:\n        if x > best:\n            best = x\n    return best"
);

const none = new Set<number>();
function ready(code: string, starter: ReadonlySet<number> = none): Set<number> {
  const fp = preparePython(code, starter);
  assert.ok(fp, "expected a comparable answer");
  return fp;
}

test("pythonTokens drops comments and whitespace and blurs names, strings and numbers", () => {
  assert.deepEqual(pythonTokens('total = int(x)  # sum\ns = f"hi {x}" + 2.5'), [
    "V", "=", "int", "(", "V", ")", "V", "=", "S", "+", "N",
  ]);
  assert.deepEqual(pythonTokens('doc = """a\nb""" ; y = 1.5e3 ** 2 // 3'), [
    "V", "=", "S", ";", "V", "=", "N", "**", "N", "//", "N",
  ]);
});

test("names after a dot stay, so methods count but a variable called count does not", () => {
  assert.deepEqual(pythonTokens("count = 0\nnums.append(count)"), [
    "V", "=", "N", "V", ".", "append", "(", "V", ")",
  ]);
});

test("renaming, comments and blank lines do not hide a copy", () => {
  assert.equal(comparePython(ready(ORIGINAL), ready(RENAMED)), 1);
});

test("a copy with extra code added still matches", () => {
  assert.ok(comparePython(ready(ORIGINAL), ready(PADDED)) >= 0.9);
});

test("different programs, and different solutions to the same task, stay below 70%", () => {
  assert.ok(comparePython(ready(ORIGINAL), ready(UNRELATED)) < 0.7);
  assert.ok(comparePython(ready(ORIGINAL), ready(OTHER_WAY)) < 0.7);
  assert.ok(comparePython(ready(ORIGINAL), ready(WHILE_WAY)) < 0.7);
});

test("the teacher's starter code is not evidence of copying", () => {
  const starter = starterFingerprints(STARTER);
  assert.ok(comparePython(ready(SUM_POSITIVE), ready(LARGEST)) > 0.5);
  assert.ok(comparePython(ready(SUM_POSITIVE, starter), ready(LARGEST, starter)) < 0.2);
  assert.equal(preparePython(STARTER, starter), null);
  const renamed = LARGEST.replace(/best/g, "top");
  assert.equal(comparePython(ready(LARGEST, starter), ready(renamed, starter)), 1);
});

test(`answers shorter than ${MIN_TOKENS} tokens are not compared`, () => {
  assert.equal(preparePython("print(int(input()) * 2)", none), null);
});

test("fewer tokens than one hashed run give no fingerprints", () => {
  assert.equal(fingerprints(["V", "="]).size, 0);
  assert.equal(starterFingerprints(undefined).size, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/plagiarism/python.test.ts`
Expected: FAIL with `Cannot find module '@/lib/plagiarism/python'`.

- [ ] **Step 3: Implement**

`src/lib/plagiarism/python.ts`:

```ts
/*
 * Python answer fingerprints for spotting copies (winnowing, as in MOSS).
 * Names, strings and numbers are blurred first, so renaming variables,
 * editing comments or reformatting does not hide a copy.
 */

/** Keywords and builtins stay as written; every other bare name becomes "V". */
const KEEP = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
  "print", "input", "int", "float", "str", "bool", "len", "range", "list", "dict", "set", "tuple",
  "map", "filter", "sorted", "reversed", "sum", "min", "max", "abs", "round", "enumerate", "zip",
  "open", "ord", "chr",
]);

/** 1 comment · 2 string · 3 number · 4 name · 5 operator or bracket */
const TOKEN_RE =
  /(#[^\n]*)|((?:[rRbBuUfF]{1,2})?(?:'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"))|(\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(\*\*=?|\/\/=?|<<=?|>>=?|->|:=|[-+*/%&|^@<>=!]=|\S)/g;

export function pythonTokens(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(TOKEN_RE)) {
    if (m[1] !== undefined) continue;
    if (m[2] !== undefined) out.push("S");
    else if (m[3] !== undefined) out.push("N");
    // Method and attribute names (after ".") stay: .append, .split, .count…
    else if (m[4] !== undefined) out.push(KEEP.has(m[4]) || out.at(-1) === "." ? m[4] : "V");
    else out.push(m[5]);
  }
  return out;
}

const K = 5; // tokens per hashed run
const W = 4; // runs per winnowing window
export const MIN_TOKENS = 15;

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The smallest hash of every window of W runs (rightmost on a tie). */
export function fingerprints(tokens: readonly string[]): Set<number> {
  const hashes: number[] = [];
  for (let i = 0; i + K <= tokens.length; i++) {
    hashes.push(fnv1a(tokens.slice(i, i + K).join(" ")));
  }
  const picked = new Set<number>();
  if (hashes.length === 0) return picked;
  const windows = Math.max(1, hashes.length - W + 1);
  for (let start = 0; start < windows; start++) {
    const end = Math.min(start + W, hashes.length);
    let best = start;
    for (let i = start; i < end; i++) if (hashes[i] <= hashes[best]) best = i;
    picked.add(hashes[best]);
  }
  return picked;
}

export function starterFingerprints(code: string | undefined): Set<number> {
  return fingerprints(pythonTokens(code ?? ""));
}

/** null when the answer is too short, or nothing but the starter code. */
export function preparePython(code: string, starter: ReadonlySet<number>): Set<number> | null {
  const tokens = pythonTokens(code);
  if (tokens.length < MIN_TOKENS) return null;
  const fp = fingerprints(tokens);
  for (const h of starter) fp.delete(h);
  return fp.size > 0 ? fp : null;
}

/** Share of the smaller answer found in the other (0–1), so padding a copy doesn't hide it. */
export function comparePython(a: ReadonlySet<number>, b: ReadonlySet<number>): number {
  let shared = 0;
  for (const h of a) if (b.has(h)) shared++;
  return shared / Math.min(a.size, b.size);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/plagiarism/python.test.ts`
Expected: PASS, 8/8.

---

### Task 3: Circuit shapes

**Files:**
- Create: `src/lib/plagiarism/circuit.ts`
- Test: `src/lib/plagiarism/circuit.test.ts`

**Interfaces:**
- Consumes: `parseCircuit(raw: unknown): ParsedCircuit` and `type Circuit` from `@/lib/logic/circuit`; `gateArity` from `@/lib/logic/gates`.
- Produces:
  - `circuitShape(answer: string): Map<string, number> | null`. The answer is the stored JSON string.
  - `compareShapes(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number`
  - `MIN_GATES = 2`

- [ ] **Step 1: Write the failing test**

`src/lib/plagiarism/circuit.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Circuit } from "@/lib/logic/circuit";
import { circuitShape, compareShapes } from "@/lib/plagiarism/circuit";

// Q = (A AND B) OR NOT C
const ONE: Circuit = {
  gates: [
    { id: "g1", type: "AND", x: 0, y: 0 },
    { id: "g2", type: "NOT", x: 0, y: 80 },
    { id: "g3", type: "OR", x: 150, y: 40 },
  ],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "in:C", to: "g2", port: 0 },
    { from: "g1", to: "g3", port: 0 },
    { from: "g2", to: "g3", port: 1 },
    { from: "g3", to: "out:Q", port: 0 },
  ],
};
// The same circuit: other ids, other positions, AND/OR inputs swapped.
const TWO: Circuit = {
  gates: [
    { id: "n", type: "NOT", x: 500, y: 500 },
    { id: "or1", type: "OR", x: 10, y: 10 },
    { id: "and1", type: "AND", x: 90, y: 300 },
  ],
  wires: [
    { from: "in:B", to: "and1", port: 0 },
    { from: "in:A", to: "and1", port: 1 },
    { from: "in:C", to: "n", port: 0 },
    { from: "n", to: "or1", port: 0 },
    { from: "and1", to: "or1", port: 1 },
    { from: "or1", to: "out:Q", port: 0 },
  ],
};
// Q = NOT ((A NAND B) XOR C)
const THREE: Circuit = {
  gates: [
    { id: "a", type: "NAND", x: 0, y: 0 },
    { id: "b", type: "XOR", x: 0, y: 0 },
    { id: "c", type: "NOT", x: 0, y: 0 },
  ],
  wires: [
    { from: "in:A", to: "a", port: 0 },
    { from: "in:B", to: "a", port: 1 },
    { from: "a", to: "b", port: 0 },
    { from: "in:C", to: "b", port: 1 },
    { from: "b", to: "c", port: 0 },
    { from: "c", to: "out:Q", port: 0 },
  ],
};
const LOOP: Circuit = {
  gates: [
    { id: "p", type: "AND", x: 0, y: 0 },
    { id: "q", type: "OR", x: 0, y: 0 },
  ],
  wires: [
    { from: "q", to: "p", port: 0 },
    { from: "p", to: "q", port: 0 },
    { from: "q", to: "out:Q", port: 0 },
  ],
};
const shape = (c: Circuit) => {
  const s = circuitShape(JSON.stringify(c));
  assert.ok(s, "expected a comparable circuit");
  return s;
};

test("the shape lists every gate by what feeds it, plus every output", () => {
  assert.deepEqual(Object.fromEntries(shape(ONE)), {
    "AND(A,B)": 1,
    "NOT(C)": 1,
    "OR(AND(A,B),NOT(C))": 1,
    "Q=OR(AND(A,B),NOT(C))": 1,
  });
});

test("ids, positions and the order of a gate's inputs do not matter", () => {
  assert.equal(compareShapes(shape(ONE), shape(TWO)), 1);
});

test("a different circuit scores low", () => {
  assert.ok(compareShapes(shape(ONE), shape(THREE)) < 0.7);
});

test("gate names stop after three levels", () => {
  const chain: Circuit = {
    gates: ["n1", "n2", "n3", "n4", "n5"].map((id) => ({ id, type: "NOT" as const, x: 0, y: 0 })),
    wires: [
      { from: "in:A", to: "n1", port: 0 },
      { from: "n1", to: "n2", port: 0 },
      { from: "n2", to: "n3", port: 0 },
      { from: "n3", to: "n4", port: 0 },
      { from: "n4", to: "n5", port: 0 },
      { from: "n5", to: "out:Q", port: 0 },
    ],
  };
  assert.deepEqual(Object.fromEntries(shape(chain)), {
    "NOT(A)": 1,
    "NOT(NOT(A))": 1,
    "NOT(NOT(NOT(A)))": 1,
    "NOT(NOT(NOT(NOT)))": 2,
    "Q=NOT(NOT(NOT(NOT)))": 1,
  });
});

test("a loop is marked instead of hanging; loose inputs show ?", () => {
  assert.deepEqual(Object.fromEntries(shape(LOOP)), {
    "AND(?,OR(?,…))": 1,
    "OR(?,AND(?,…))": 1,
    "Q=OR(?,AND(?,…))": 1,
  });
});

test("circuits under two gates, and unreadable answers, are not compared", () => {
  const single: Circuit = { gates: [{ id: "g", type: "AND", x: 0, y: 0 }], wires: [] };
  assert.equal(circuitShape(JSON.stringify(single)), null);
  assert.equal(circuitShape("{broken"), null);
  assert.equal(compareShapes(new Map(), new Map()), 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/plagiarism/circuit.test.ts`
Expected: FAIL with `Cannot find module '@/lib/plagiarism/circuit'`.

- [ ] **Step 3: Implement**

`src/lib/plagiarism/circuit.ts`:

```ts
/*
 * Circuit shapes for spotting copies: each gate is named by what feeds it,
 * a few levels deep, so gate ids, positions and input order never matter.
 */
import { parseCircuit } from "@/lib/logic/circuit";
import { gateArity } from "@/lib/logic/gates";

const DEPTH = 3;
export const MIN_GATES = 2;

/** Multiset of gate names; null when unreadable or under MIN_GATES gates. */
export function circuitShape(answer: string): Map<string, number> | null {
  const parsed = parseCircuit(answer);
  if (!parsed.ok || parsed.circuit.gates.length < MIN_GATES) return null;
  const { gates, wires } = parsed.circuit;
  const byId = new Map(gates.map((g) => [g.id, g]));
  const driver = new Map(wires.map((w) => [`${w.to}#${w.port}`, w.from]));

  const name = (end: string, depth: number, path: ReadonlySet<string>): string => {
    if (end.startsWith("in:")) return end.slice(3);
    const gate = byId.get(end);
    if (!gate) return "?";
    if (path.has(end)) return "…";
    if (depth === 0) return gate.type;
    const next = new Set(path).add(end);
    const inputs = Array.from({ length: gateArity(gate.type) }, (_, port) => {
      const from = driver.get(`${end}#${port}`);
      return from ? name(from, depth - 1, next) : "?";
    });
    return `${gate.type}(${inputs.sort().join(",")})`;
  };

  const shape = new Map<string, number>();
  const add = (key: string) => shape.set(key, (shape.get(key) ?? 0) + 1);
  for (const g of gates) add(name(g.id, DEPTH, new Set()));
  for (const w of wires) {
    if (w.to.startsWith("out:")) add(`${w.to.slice(4)}=${name(w.from, DEPTH, new Set())}`);
  }
  return shape;
}

/** Multiset Jaccard: shared names over all names (0–1). */
export function compareShapes(
  a: ReadonlyMap<string, number>,
  b: ReadonlyMap<string, number>
): number {
  let shared = 0;
  let total = 0;
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(key) ?? 0;
    const y = b.get(key) ?? 0;
    shared += Math.min(x, y);
    total += Math.max(x, y);
  }
  return total === 0 ? 0 : shared / total;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/plagiarism/circuit.test.ts`
Expected: PASS, 6/6.

---

### Task 4: Circuit → formula

**Files:**
- Create: `src/lib/logic/formula.ts`
- Test: `src/lib/logic/formula.test.ts`

**Interfaces:**
- Consumes: `type Circuit` from `@/lib/logic/circuit`.
- Produces: `circuitFormulas(circuit: Circuit, outputs: readonly string[]): string[]`, with one `"Q = …"` per output name.

- [ ] **Step 1: Write the failing test**

`src/lib/logic/formula.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Circuit } from "@/lib/logic/circuit";
import { circuitFormulas } from "@/lib/logic/formula";

const ONE: Circuit = {
  gates: [
    { id: "g1", type: "AND", x: 0, y: 0 },
    { id: "g2", type: "NOT", x: 0, y: 80 },
    { id: "g3", type: "OR", x: 150, y: 40 },
  ],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "in:C", to: "g2", port: 0 },
    { from: "g1", to: "g3", port: 0 },
    { from: "g2", to: "g3", port: 1 },
    { from: "g3", to: "out:Q", port: 0 },
  ],
};
const THREE: Circuit = {
  gates: [
    { id: "a", type: "NAND", x: 0, y: 0 },
    { id: "b", type: "XOR", x: 0, y: 0 },
    { id: "c", type: "NOT", x: 0, y: 0 },
  ],
  wires: [
    { from: "in:A", to: "a", port: 0 },
    { from: "in:B", to: "a", port: 1 },
    { from: "a", to: "b", port: 0 },
    { from: "in:C", to: "b", port: 1 },
    { from: "b", to: "c", port: 0 },
    { from: "c", to: "out:Q", port: 0 },
  ],
};
const LOOP: Circuit = {
  gates: [
    { id: "p", type: "AND", x: 0, y: 0 },
    { id: "q", type: "OR", x: 0, y: 0 },
  ],
  wires: [
    { from: "q", to: "p", port: 0 },
    { from: "p", to: "q", port: 0 },
    { from: "q", to: "out:Q", port: 0 },
  ],
};

test("one formula per output, outer brackets dropped", () => {
  assert.deepEqual(circuitFormulas(ONE, ["Q"]), ["Q = (A AND B) OR NOT C"]);
});

test("NOT puts a compound input in brackets", () => {
  assert.deepEqual(circuitFormulas(THREE, ["Q"]), ["Q = NOT ((A NAND B) XOR C)"]);
});

test("unconnected inputs and outputs show ?", () => {
  const half: Circuit = {
    gates: [{ id: "g", type: "AND", x: 0, y: 0 }],
    wires: [
      { from: "in:A", to: "g", port: 0 },
      { from: "g", to: "out:Q", port: 0 },
    ],
  };
  assert.deepEqual(circuitFormulas(half, ["Q", "R"]), ["Q = A AND ?", "R = ?"]);
});

test("a loop shows … instead of hanging", () => {
  assert.deepEqual(circuitFormulas(LOOP, ["Q"]), ["Q = (… AND ?) OR ?"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/logic/formula.test.ts`
Expected: FAIL with `Cannot find module '@/lib/logic/formula'`.

- [ ] **Step 3: Implement**

`src/lib/logic/formula.ts`:

```ts
import type { Circuit } from "@/lib/logic/circuit";

/** "Q = (A AND B) OR NOT C" for each output, for teachers reading answers. */
export function circuitFormulas(circuit: Circuit, outputs: readonly string[]): string[] {
  const byId = new Map(circuit.gates.map((g) => [g.id, g]));
  const driver = new Map(circuit.wires.map((w) => [`${w.to}#${w.port}`, w.from]));

  const expr = (end: string | undefined, path: ReadonlySet<string>): string => {
    if (!end) return "?";
    if (end.startsWith("in:")) return end.slice(3);
    const gate = byId.get(end);
    if (!gate) return "?";
    if (path.has(end)) return "…";
    const next = new Set(path).add(end);
    const a = expr(driver.get(`${end}#0`), next);
    if (gate.type === "NOT") return `NOT ${a}`;
    const b = expr(driver.get(`${end}#1`), next);
    return `(${a} ${gate.type} ${b})`;
  };

  return outputs.map((out) => `${out} = ${unwrap(expr(driver.get(`out:${out}#0`), new Set()))}`);
}

/** Drops one pair of brackets around the whole text: "(A AND B)" → "A AND B". */
function unwrap(text: string): string {
  if (!text.startsWith("(") || !text.endsWith(")")) return text;
  let depth = 0;
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") depth--;
    if (depth === 0) return text;
  }
  return text.slice(1, -1);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/logic/formula.test.ts`
Expected: PASS, 4/4.

---

### Task 5: Pair finder

**Files:**
- Create: `src/lib/plagiarism/pairs.ts`
- Test: `src/lib/plagiarism/pairs.test.ts`

**Interfaces:**
- Consumes: from Task 2, `preparePython`, `comparePython` and `starterFingerprints`; from Task 3, `circuitShape` and `compareShapes`.
- Produces:
  - `SimilarEntry { uid: string; name: string; score: number; answer: string }`
  - `SimilarPair { a: SimilarEntry; b: SimilarEntry; similarity: number }`
  - `findSimilarPairs(kind: "python" | "logic", entries: readonly SimilarEntry[], opts?: { starterCode?: string }): { pairs: SimilarPair[]; skipped: number }`
  - `SIMILARITY_THRESHOLD = 0.7` and `MAX_PAIRS = 50`

- [ ] **Step 1: Write the failing test**

`src/lib/plagiarism/pairs.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_PAIRS, findSimilarPairs, type SimilarEntry } from "@/lib/plagiarism/pairs";

const ORIGINAL = `n = int(input())
total = 0
for i in range(n):
    x = int(input())
    if x % 2 == 0:
        total += x
print(total)
`;
const RENAMED = `count = int(input())
s = 0
for k in range(count):
    v = int(input())  # read
    if v % 2 == 0:
        s += v
print(s)
`;
// One condition changed: about 82% alike.
const TWEAKED = ORIGINAL.replace("if x % 2 == 0:", "if x > 0:");
const UNRELATED = `word = input()
if word == word[::-1]:
    print("YES")
else:
    print("NO")
`;
const circuit = (swap: boolean) =>
  JSON.stringify({
    gates: [
      { id: swap ? "x" : "g1", type: "AND", x: swap ? 300 : 0, y: 0 },
      { id: swap ? "y" : "g2", type: "OR", x: 0, y: swap ? 300 : 0 },
    ],
    wires: [
      { from: swap ? "in:B" : "in:A", to: swap ? "x" : "g1", port: 0 },
      { from: swap ? "in:A" : "in:B", to: swap ? "x" : "g1", port: 1 },
      { from: swap ? "x" : "g1", to: swap ? "y" : "g2", port: 0 },
      { from: "in:C", to: swap ? "y" : "g2", port: 1 },
      { from: swap ? "y" : "g2", to: "out:Q", port: 0 },
    ],
  });
const entry = (uid: string, answer: string, score = 100): SimilarEntry => ({
  uid,
  name: uid,
  score,
  answer,
});
const summary = (pairs: { a: SimilarEntry; b: SimilarEntry; similarity: number }[]) =>
  pairs.map((p) => [p.a.uid, p.b.uid, Math.round(p.similarity * 100)]);

test("python: copies pair up; unrelated and too-short answers do not", () => {
  const { pairs, skipped } = findSimilarPairs("python", [
    entry("a", ORIGINAL),
    entry("b", RENAMED),
    entry("c", UNRELATED),
    entry("d", "print(1)"),
  ]);
  assert.equal(skipped, 1);
  assert.deepEqual(summary(pairs), [["a", "b", 100]]);
});

test("python: most alike first", () => {
  const { pairs } = findSimilarPairs("python", [
    entry("a", ORIGINAL),
    entry("b", RENAMED),
    entry("c", TWEAKED),
  ]);
  assert.deepEqual(summary(pairs), [
    ["a", "b", 100],
    ["a", "c", 82],
    ["b", "c", 82],
  ]);
});

test("python: answers that are only the starter code are skipped", () => {
  const starter = ORIGINAL;
  assert.equal(findSimilarPairs("python", [entry("a", starter), entry("b", starter)]).pairs.length, 1);
  const withStarter = findSimilarPairs("python", [entry("a", starter), entry("b", starter)], {
    starterCode: starter,
  });
  assert.deepEqual(withStarter, { pairs: [], skipped: 2 });
});

test("logic: the same structure pairs at 100%; unreadable and tiny circuits are skipped", () => {
  const tiny = JSON.stringify({ gates: [{ id: "g", type: "NOT", x: 0, y: 0 }], wires: [] });
  const { pairs, skipped } = findSimilarPairs("logic", [
    entry("a", circuit(false)),
    entry("b", circuit(true)),
    entry("c", "{broken"),
    entry("d", tiny),
  ]);
  assert.equal(skipped, 2);
  assert.deepEqual(summary(pairs), [["a", "b", 100]]);
});

test(`at most ${MAX_PAIRS} pairs; nothing in, nothing out`, () => {
  const many = Array.from({ length: 12 }, (_, i) => entry(`s${i}`, ORIGINAL));
  assert.equal(findSimilarPairs("python", many).pairs.length, MAX_PAIRS);
  assert.deepEqual(findSimilarPairs("python", []), { pairs: [], skipped: 0 });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/plagiarism/pairs.test.ts`
Expected: FAIL with `Cannot find module '@/lib/plagiarism/pairs'`.

- [ ] **Step 3: Implement**

`src/lib/plagiarism/pairs.ts`:

```ts
import { circuitShape, compareShapes } from "@/lib/plagiarism/circuit";
import { comparePython, preparePython, starterFingerprints } from "@/lib/plagiarism/python";

export const SIMILARITY_THRESHOLD = 0.7;
export const MAX_PAIRS = 50;

export interface SimilarEntry {
  uid: string;
  /** Participant name, or their email when they have none. */
  name: string;
  score: number;
  /** Python code or the circuit JSON, as stored. */
  answer: string;
}

export interface SimilarPair {
  a: SimilarEntry;
  b: SimilarEntry;
  /** 0–1 */
  similarity: number;
}

/** Pairs of one problem's answers at or above the threshold, most alike first. */
export function findSimilarPairs(
  kind: "python" | "logic",
  entries: readonly SimilarEntry[],
  opts: { starterCode?: string } = {}
): { pairs: SimilarPair[]; skipped: number } {
  if (kind === "python") {
    const starter = starterFingerprints(opts.starterCode);
    return pairUp(entries, (e) => preparePython(e.answer, starter), comparePython);
  }
  return pairUp(entries, (e) => circuitShape(e.answer), compareShapes);
}

function pairUp<T>(
  entries: readonly SimilarEntry[],
  prepare: (entry: SimilarEntry) => T | null,
  compare: (a: T, b: T) => number
): { pairs: SimilarPair[]; skipped: number } {
  const ready = entries.flatMap((entry) => {
    const shape = prepare(entry);
    return shape === null ? [] : [{ entry, shape }];
  });
  const pairs: SimilarPair[] = [];
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      const similarity = compare(ready[i].shape, ready[j].shape);
      if (similarity >= SIMILARITY_THRESHOLD) {
        pairs.push({ a: ready[i].entry, b: ready[j].entry, similarity });
      }
    }
  }
  // Stable: equal scores keep the entries' order.
  pairs.sort((x, y) => y.similarity - x.similarity);
  return { pairs: pairs.slice(0, MAX_PAIRS), skipped: entries.length - ready.length };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/plagiarism/pairs.test.ts`
Expected: PASS, 5/5.

---

### Task 6: Submission queries

**Files:**
- Create: `src/lib/db/contest-submissions.ts`
- Test: `src/lib/db/contest-submissions.test.ts`

**Interfaces:**
- Consumes: `getDb` from `@/lib/db/client`; `contestParticipants` and `contestSubmissions` from `@/lib/db/schema`.
- Produces:
  - `SubmissionRow { id; uid; name: string | null; email; problem_id; code; score; passed_tests; total_tests; submitted_at: number }`
  - `listContestSubmissions(contestId, { uid?, problemId?, limit, offset }): Promise<{ rows: SubmissionRow[]; total: number }>`
  - `bestSubmissions(contestId): Promise<SubmissionRow[]>`
  - `allContestSubmissions(contestId): Promise<SubmissionRow[]>`

- [ ] **Step 1: Write the failing test**

`src/lib/db/contest-submissions.test.ts`:

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { contestSubmissions } from "@/lib/db/schema";
import { registerParticipant, upsertContest } from "@/lib/db/contests";
import {
  allContestSubmissions,
  bestSubmissions,
  listContestSubmissions,
} from "@/lib/db/contest-submissions";

beforeEach(resetDb);
after(closeDb);

const CUP = "cup";

async function seed(): Promise<void> {
  for (const id of [CUP, "other"]) {
    await upsertContest({
      id,
      title: id,
      description: "",
      starts_at: Date.parse("2026-03-01T09:00:00Z"),
      ends_at: Date.parse("2026-03-01T12:00:00Z"),
    });
  }
  await addUser("s1");
  await addUser("s2");
  await registerParticipant(CUP, { uid: "s1", name: "Бат", email: "s1@x" });
  await registerParticipant(CUP, { uid: "s2", name: null, email: "s2@x" });
  await registerParticipant("other", { uid: "s1", name: "Бат", email: "s1@x" });
}

/** One attempt at 09:<minute> UTC; its code names who, what and when. */
async function attempt(uid: string, problemId: string, score: number, minute: number, contestId = CUP) {
  await getDb()
    .insert(contestSubmissions)
    .values({
      contest_id: contestId,
      uid,
      problem_id: problemId,
      code: `${uid}-${problemId}-${minute}`,
      score,
      passed_tests: 1,
      total_tests: 2,
      submitted_at: new Date(Date.UTC(2026, 2, 1, 9, minute)),
    });
}

test("listContestSubmissions: newest first, with names, only this contest", async () => {
  await seed();
  await attempt("s1", "p1", 10, 1);
  await attempt("s2", "p1", 20, 2);
  await attempt("s1", "p2", 30, 3);
  await attempt("s1", "p1", 40, 4, "other");

  const { rows, total } = await listContestSubmissions(CUP, { limit: 10, offset: 0 });
  assert.equal(total, 3);
  assert.deepEqual(rows.map((r) => r.code), ["s1-p2-3", "s2-p1-2", "s1-p1-1"]);
  assert.equal(rows[0].name, "Бат");
  assert.equal(rows[1].name, null);
  assert.equal(rows[1].email, "s2@x");
  assert.equal(rows[0].submitted_at, Date.UTC(2026, 2, 1, 9, 3));
  assert.equal(rows[0].score, 30);
});

test("listContestSubmissions: filters by student and problem, and pages", async () => {
  await seed();
  await attempt("s1", "p1", 10, 1);
  await attempt("s2", "p1", 20, 2);
  await attempt("s1", "p2", 30, 3);

  const s1 = await listContestSubmissions(CUP, { uid: "s1", limit: 10, offset: 0 });
  assert.deepEqual([s1.total, s1.rows.map((r) => r.code)], [2, ["s1-p2-3", "s1-p1-1"]]);
  const p1 = await listContestSubmissions(CUP, { problemId: "p1", limit: 1, offset: 1 });
  assert.deepEqual([p1.total, p1.rows.map((r) => r.code)], [2, ["s1-p1-1"]]);
});

test("bestSubmissions: highest score per student and problem, latest on a tie", async () => {
  await seed();
  await attempt("s1", "p1", 50, 1);
  await attempt("s1", "p1", 80, 2);
  await attempt("s1", "p1", 80, 3);
  await attempt("s1", "p1", 20, 4);
  await attempt("s2", "p1", 0, 5);
  await attempt("s1", "p2", 10, 6);
  await attempt("s1", "p1", 99, 7, "other");

  const best = await bestSubmissions(CUP);
  assert.deepEqual(best.map((r) => r.code).sort(), ["s1-p1-3", "s1-p2-6", "s2-p1-5"]);
});

test("allContestSubmissions: every attempt of this contest, oldest first", async () => {
  await seed();
  await attempt("s2", "p1", 20, 2);
  await attempt("s1", "p1", 10, 1);
  await attempt("s1", "p1", 40, 3, "other");

  assert.deepEqual((await allContestSubmissions(CUP)).map((r) => r.code), ["s1-p1-1", "s2-p1-2"]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --env-file=.env.local --conditions=react-server --test src/lib/db/contest-submissions.test.ts`
Expected: FAIL with `Cannot find module '@/lib/db/contest-submissions'`.

- [ ] **Step 3: Implement**

`src/lib/db/contest-submissions.ts`:

```ts
import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { contestParticipants, contestSubmissions } from "@/lib/db/schema";

/** One attempt with the participant's name and email. */
export interface SubmissionRow {
  id: number;
  uid: string;
  name: string | null;
  email: string;
  problem_id: string;
  /** Python code, or the circuit as JSON. */
  code: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  /** epoch ms */
  submitted_at: number;
}

const columns = {
  id: contestSubmissions.id,
  uid: contestSubmissions.uid,
  name: contestParticipants.name,
  email: contestParticipants.email,
  problem_id: contestSubmissions.problem_id,
  code: contestSubmissions.code,
  score: contestSubmissions.score,
  passed_tests: contestSubmissions.passed_tests,
  total_tests: contestSubmissions.total_tests,
  submitted_at: contestSubmissions.submitted_at,
};

const participantOf = and(
  eq(contestParticipants.contest_id, contestSubmissions.contest_id),
  eq(contestParticipants.uid, contestSubmissions.uid)
);

function toRow(r: Omit<SubmissionRow, "submitted_at"> & { submitted_at: Date }): SubmissionRow {
  return { ...r, submitted_at: r.submitted_at.getTime() };
}

/** Newest first; `total` counts every attempt matching the filters. */
export async function listContestSubmissions(
  contestId: string,
  opts: { uid?: string; problemId?: string; limit: number; offset: number }
): Promise<{ rows: SubmissionRow[]; total: number }> {
  const where = and(
    eq(contestSubmissions.contest_id, contestId),
    opts.uid ? eq(contestSubmissions.uid, opts.uid) : undefined,
    opts.problemId ? eq(contestSubmissions.problem_id, opts.problemId) : undefined
  );
  const [rows, [{ total }]] = await Promise.all([
    getDb()
      .select(columns)
      .from(contestSubmissions)
      .innerJoin(contestParticipants, participantOf)
      .where(where)
      .orderBy(desc(contestSubmissions.submitted_at), desc(contestSubmissions.id))
      .limit(opts.limit)
      .offset(opts.offset),
    getDb().select({ total: count() }).from(contestSubmissions).where(where),
  ]);
  return { rows: rows.map(toRow), total };
}

/** Each student's best attempt per problem: highest score, then the latest. */
export async function bestSubmissions(contestId: string): Promise<SubmissionRow[]> {
  const rows = await getDb()
    .selectDistinctOn([contestSubmissions.uid, contestSubmissions.problem_id], columns)
    .from(contestSubmissions)
    .innerJoin(contestParticipants, participantOf)
    .where(eq(contestSubmissions.contest_id, contestId))
    .orderBy(
      contestSubmissions.uid,
      contestSubmissions.problem_id,
      desc(contestSubmissions.score),
      desc(contestSubmissions.submitted_at),
      desc(contestSubmissions.id)
    );
  return rows.map(toRow);
}

/** Every attempt, oldest first — for the CSV export. */
export async function allContestSubmissions(contestId: string): Promise<SubmissionRow[]> {
  const rows = await getDb()
    .select(columns)
    .from(contestSubmissions)
    .innerJoin(contestParticipants, participantOf)
    .where(eq(contestSubmissions.contest_id, contestId))
    .orderBy(asc(contestSubmissions.submitted_at), asc(contestSubmissions.id));
  return rows.map(toRow);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --env-file=.env.local --conditions=react-server --test src/lib/db/contest-submissions.test.ts`
Expected: PASS, 4/4. If `tsc` rejects the `toRow` parameter type for the Drizzle rows, widen it to `typeof rows[number]` at each call site. The shape is identical; this is a typing fix, not a behaviour change.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no output.

---

### Task 7: CSV export

**Files:**
- Create: `src/lib/contest-export.ts`, `src/lib/contest-export.test.ts`
- Create: `src/app/api/teacher/contests/[contestId]/export/route.ts`

**Interfaces:**
- Consumes:
  - `toCsv` (Task 1), `formatDateTime` (Task 1), `circuitFormulas` (Task 4) and `SubmissionRow` (Task 6).
  - `parseCircuit`, plus `ContestProblem` and `Participant` from `@/lib/db/contests`, and `listProblems`, `listParticipants` and `getContest`.
- Produces:
  - `answerText(problem: ContestProblem | undefined, code: string): string`
  - `resultsCsv(problems: ContestProblem[], participants: Participant[]): string`
  - `attemptsCsv(problems: ContestProblem[], rows: SubmissionRow[]): string`
  - `GET /api/teacher/contests/[contestId]/export?type=results|attempts`

- [ ] **Step 1: Write the failing test**

`src/lib/contest-export.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { answerText, attemptsCsv, resultsCsv } from "@/lib/contest-export";
import type { ContestProblem, Participant } from "@/lib/db/contests";
import type { SubmissionRow } from "@/lib/db/contest-submissions";

const PY: ContestProblem = {
  id: "p1",
  title: "Нийлбэр",
  prompt: "",
  order: 1,
  points: 100,
  kind: "python",
  public_test_cases: [],
};
const LOGIC: ContestProblem = {
  id: "p2",
  title: "Хэлхээ",
  prompt: "",
  order: 2,
  points: 50,
  kind: "logic",
  public_test_cases: [],
  logic_spec: { inputs: ["A", "B"], outputs: ["Q"], allowed_gates: ["AND"], max_gates: null, table_visible: false },
};
const CIRCUIT = JSON.stringify({
  gates: [{ id: "g1", type: "AND", x: 0, y: 0 }],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "g1", to: "out:Q", port: 0 },
  ],
});
const person = (uid: string, name: string | null, scores: Record<string, number>, total: number): Participant => ({
  uid,
  name,
  email: `${uid}@x`,
  scores,
  total,
  last_improved_at: null,
});

test("results: one row per participant in leaderboard order; missing scores are 0; no name → email", () => {
  const csv = resultsCsv(
    [PY, LOGIC],
    [person("s1", "Бат", { p1: 100, p2: 50 }, 150), person("s2", null, { p1: 40 }, 40)]
  );
  assert.equal(
    csv,
    '"Байр","Нэр","Имэйл","Нийлбэр","Хэлхээ","Нийт"\r\n' +
      '1,"Бат","s1@x",100,50,150\r\n' +
      '2,"s2@x","s2@x",40,0,40\r\n'
  );
});

test("results with no participants is just the header", () => {
  assert.equal(resultsCsv([PY], []), '"Байр","Нэр","Имэйл","Нийлбэр","Нийт"\r\n');
});

test("attempts: school time, kind, and the answer as code or formulas", () => {
  const rows: SubmissionRow[] = [
    { id: 1, uid: "s1", name: "Бат", email: "s1@x", problem_id: "p1", code: "print(1)", score: 100, passed_tests: 2, total_tests: 2, submitted_at: Date.parse("2026-03-01T01:02:03Z") },
    { id: 2, uid: "s2", name: null, email: "s2@x", problem_id: "p2", code: CIRCUIT, score: 50, passed_tests: 4, total_tests: 4, submitted_at: Date.parse("2026-03-01T01:05:00Z") },
  ];
  assert.equal(
    attemptsCsv([PY, LOGIC], rows),
    '"Цаг","Нэр","Имэйл","Бодлого","Төрөл","Оноо","Дээд оноо","Давсан тест","Нийт тест","Хариулт"\r\n' +
      '"2026-03-01 09:02:03","Бат","s1@x","Нийлбэр","Python",100,100,2,2,"print(1)"\r\n' +
      '"2026-03-01 09:05:00","s2@x","s2@x","Хэлхээ","Хэлхээ",50,50,4,4,"Q = A AND B"\r\n'
  );
});

test("answerText keeps the stored text when a circuit can't be read or the problem is gone", () => {
  assert.equal(answerText(LOGIC, "{broken"), "{broken");
  assert.equal(answerText(undefined, "x = 1"), "x = 1");
  assert.equal(answerText(LOGIC, CIRCUIT), "Q = A AND B");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/contest-export.test.ts`
Expected: FAIL with `Cannot find module '@/lib/contest-export'`.

- [ ] **Step 3: Implement the builders**

`src/lib/contest-export.ts`:

```ts
import { toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/datetime";
import { parseCircuit } from "@/lib/logic/circuit";
import { circuitFormulas } from "@/lib/logic/formula";
import type { ContestProblem, Participant } from "@/lib/db/contests";
import type { SubmissionRow } from "@/lib/db/contest-submissions";

/** Python code as written; a circuit as one formula line per output. */
export function answerText(problem: ContestProblem | undefined, code: string): string {
  if (problem?.kind !== "logic" || !problem.logic_spec) return code;
  const parsed = parseCircuit(code);
  return parsed.ok ? circuitFormulas(parsed.circuit, problem.logic_spec.outputs).join("\n") : code;
}

/** «Дүн»: leaderboard order, best score per problem. */
export function resultsCsv(problems: ContestProblem[], participants: Participant[]): string {
  const header = ["Байр", "Нэр", "Имэйл", ...problems.map((p) => p.title), "Нийт"];
  const rows = participants.map((p, i) => [
    i + 1,
    p.name ?? p.email,
    p.email,
    ...problems.map((problem) => p.scores[problem.id] ?? 0),
    p.total,
  ]);
  return toCsv([header, ...rows]);
}

/** «Бүх оролдлого»: every attempt, as given (oldest first). */
export function attemptsCsv(problems: ContestProblem[], rows: SubmissionRow[]): string {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const header = ["Цаг", "Нэр", "Имэйл", "Бодлого", "Төрөл", "Оноо", "Дээд оноо", "Давсан тест", "Нийт тест", "Хариулт"];
  return toCsv([
    header,
    ...rows.map((r) => {
      const problem = byId.get(r.problem_id);
      return [
        formatDateTime(r.submitted_at),
        r.name ?? r.email,
        r.email,
        problem?.title ?? r.problem_id,
        problem?.kind === "logic" ? "Хэлхээ" : "Python",
        r.score,
        problem?.points ?? "",
        r.passed_tests,
        r.total_tests,
        answerText(problem, r.code),
      ];
    }),
  ]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/contest-export.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Read the route-handler docs, then write the route**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (params is a Promise; `NextRequest.nextUrl.searchParams`).

`src/app/api/teacher/contests/[contestId]/export/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { getContest, listParticipants, listProblems } from "@/lib/db/contests";
import { allContestSubmissions } from "@/lib/db/contest-submissions";
import { attemptsCsv, resultsCsv } from "@/lib/contest-export";
import { isStaff } from "@/lib/types";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

/** CSV for Excel: ?type=results («Дүн») or ?type=attempts («Бүх оролдлого»). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ татах эрхтэй.", 403);

  const type = req.nextUrl.searchParams.get("type");
  if (type !== "results" && type !== "attempts") return fail("Файлын төрөл буруу байна.", 400);
  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) return fail("Тэмцээн олдсонгүй.", 404);

  const problems = await listProblems(contestId);
  const body =
    type === "results"
      ? resultsCsv(problems, await listParticipants(contestId))
      : attemptsCsv(problems, await allContestSubmissions(contestId));
  const filename = `${contest.id}-${type === "results" ? "dun" : "oroldlogo"}.csv`;

  // The BOM makes Excel read the file as UTF-8 (Cyrillic).
  return new NextResponse(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no output. (The route is verified in the browser in Task 8.)

---

### Task 8: Submissions page

**Files:**
- Create: `src/lib/submissions-query.ts`, `src/lib/submissions-query.test.ts`
- Create: `src/components/teacher/contest-submissions.tsx`
- Create: `src/app/teacher/contests/[contestId]/submissions/page.tsx`
- Modify: `src/app/teacher/contests/[contestId]/page.tsx` (the «Бодлогууд» card header buttons)

**Interfaces:**
- Consumes:
  - From Task 1: `formatDateTime`.
  - From Task 4: `circuitFormulas`.
  - From Task 5: `findSimilarPairs` and `SimilarPair`.
  - From Task 6: `listContestSubmissions`, `bestSubmissions` and `SubmissionRow`.
  - `parseCircuit`, `getContest`, `listProblems` and `listParticipants`.
- Produces:
  - `SubmissionsQuery`
  - `parseSubmissionsQuery(sp, known): SubmissionsQuery`
  - `submissionsHref(base, q): string`
  - The page at `/teacher/contests/[contestId]/submissions`.

- [ ] **Step 1: Write the failing test**

`src/lib/submissions-query.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSubmissionsQuery, submissionsHref } from "@/lib/submissions-query";

const known = { studentIds: ["s1", "s2"], problemIds: ["p1"] };

test("known filters and a page number are read", () => {
  assert.deepEqual(parseSubmissionsQuery({ tab: "similar", student: "s2", problem: "p1", page: "3" }, known), {
    tab: "similar",
    student: "s2",
    problem: "p1",
    page: 3,
  });
});

test("junk falls back to all students, all problems, page 1, the attempts tab", () => {
  for (const page of ["-3", "0", "abc", "2.5", ""]) {
    assert.deepEqual(parseSubmissionsQuery({ tab: "x", student: "ghost", problem: "p9", page }, known), {
      tab: "attempts",
      student: undefined,
      problem: undefined,
      page: 1,
    });
  }
  assert.deepEqual(parseSubmissionsQuery({}, known), {
    tab: "attempts",
    student: undefined,
    problem: undefined,
    page: 1,
  });
});

test("repeated parameters use the first value", () => {
  assert.equal(parseSubmissionsQuery({ student: ["s1", "s2"] }, known).student, "s1");
});

test("submissionsHref leaves defaults out of the URL", () => {
  const base = "/teacher/contests/cup/submissions";
  assert.equal(submissionsHref(base, { tab: "attempts", page: 1 }), base);
  assert.equal(
    submissionsHref(base, { tab: "similar", student: "s1", problem: "p1", page: 2 }),
    `${base}?tab=similar&student=s1&problem=p1&page=2`
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --conditions=react-server --test src/lib/submissions-query.test.ts`
Expected: FAIL with `Cannot find module '@/lib/submissions-query'`.

- [ ] **Step 3: Implement the query helpers**

`src/lib/submissions-query.ts`:

```ts
export type SubmissionsTab = "attempts" | "similar";

export interface SubmissionsQuery {
  tab: SubmissionsTab;
  student?: string;
  problem?: string;
  page: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Page searchParams → a query; unknown students/problems and junk pages fall back to "all" / 1. */
export function parseSubmissionsQuery(
  sp: SearchParams,
  known: { studentIds: readonly string[]; problemIds: readonly string[] }
): SubmissionsQuery {
  const student = first(sp.student);
  const problem = first(sp.problem);
  const page = Number(first(sp.page));
  return {
    tab: first(sp.tab) === "similar" ? "similar" : "attempts",
    student: student && known.studentIds.includes(student) ? student : undefined,
    problem: problem && known.problemIds.includes(problem) ? problem : undefined,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** Link to the submissions page; defaults are left out. */
export function submissionsHref(base: string, q: SubmissionsQuery): string {
  const params = new URLSearchParams();
  if (q.tab !== "attempts") params.set("tab", q.tab);
  if (q.student) params.set("student", q.student);
  if (q.problem) params.set("problem", q.problem);
  if (q.page > 1) params.set("page", String(q.page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --conditions=react-server --test src/lib/submissions-query.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Write the display components**

`src/components/teacher/contest-submissions.tsx` (server components, no `"use client"`):

```tsx
import type { ContestProblem } from "@/lib/db/contests";
import type { SubmissionRow } from "@/lib/db/contest-submissions";
import { formatDateTime } from "@/lib/datetime";
import { parseCircuit } from "@/lib/logic/circuit";
import { circuitFormulas } from "@/lib/logic/formula";
import type { SimilarPair } from "@/lib/plagiarism/pairs";
import { cn } from "@/lib/utils";

const PRE = "max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed";
const EMPTY = "rounded-xl border bg-background p-6 text-center text-sm text-muted-foreground";

/** Python code as written; a circuit as its formulas and gate count. */
export function AnswerView({ problem, code }: { problem: ContestProblem | undefined; code: string }) {
  if (problem?.kind === "logic" && problem.logic_spec) {
    const parsed = parseCircuit(code);
    if (!parsed.ok) {
      return (
        <div className="space-y-1">
          <p className="text-sm text-destructive">Хэлхээг уншиж чадсангүй.</p>
          <pre className={PRE}>{code}</pre>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <pre className={PRE}>{circuitFormulas(parsed.circuit, problem.logic_spec.outputs).join("\n")}</pre>
        <p className="text-xs text-muted-foreground">{parsed.circuit.gates.length} хаалга</p>
      </div>
    );
  }
  return <pre className={PRE}>{code}</pre>;
}

export function SubmissionList({ rows, problems }: { rows: SubmissionRow[]; problems: ContestProblem[] }) {
  if (rows.length === 0) return <p className={EMPTY}>Илгээлт алга.</p>;
  const byId = new Map(problems.map((p) => [p.id, p]));
  return (
    <ul className="divide-y rounded-xl border bg-background">
      {rows.map((r) => {
        const problem = byId.get(r.problem_id);
        return (
          <li key={r.id} className="min-w-0">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-muted/50">
                <span className="font-mono text-xs text-muted-foreground">{formatDateTime(r.submitted_at)}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{r.name ?? r.email}</span>
                  {r.name && <span className="ml-2 text-muted-foreground">{r.email}</span>}
                </span>
                <span className="text-muted-foreground">{problem?.title ?? r.problem_id}</span>
                <span className="font-medium tabular-nums">
                  {r.score}/{problem?.points ?? "?"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {r.passed_tests}/{r.total_tests} тест
                </span>
              </summary>
              <div className="px-4 pb-4">
                <AnswerView problem={problem} code={r.code} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function SimilarityBadge({ similarity }: { similarity: number }) {
  const percent = Math.round(similarity * 100);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        percent >= 90
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      )}
    >
      {percent}%
    </span>
  );
}

export interface SimilarGroup {
  problem: ContestProblem;
  pairs: SimilarPair[];
  skipped: number;
}

export function SimilarPairs({ groups }: { groups: SimilarGroup[] }) {
  if (groups.length === 0) return <p className={EMPTY}>Бодлого алга.</p>;
  return (
    <div className="space-y-8">
      {groups.map(({ problem, pairs, skipped }) => (
        <section key={problem.id} className="space-y-2">
          <h2 className="font-semibold">{problem.title}</h2>
          {problem.kind === "logic" && (
            <p className="text-xs text-muted-foreground">
              Хамгийн цөөн хаалгатай зөв хариулт ихэвчлэн ганц байдаг тул өндөр хувь гарах нь хуулбар гэсэн үг биш.
            </p>
          )}
          {skipped > 0 && (
            <p className="text-xs text-muted-foreground">
              {skipped} бодолт хэт богино эсвэл уншигдахгүй тул харьцуулаагүй.
            </p>
          )}
          {pairs.length === 0 ? (
            <p className={EMPTY}>Ижил төстэй бодолт олдсонгүй.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-background">
              {pairs.map((pair) => (
                <li key={`${pair.a.uid}|${pair.b.uid}`} className="min-w-0">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                      <SimilarityBadge similarity={pair.similarity} />
                      <span className="font-medium">{pair.a.name}</span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="font-medium">{pair.b.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {pair.a.score} / {pair.b.score} оноо
                      </span>
                    </summary>
                    <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                      {[pair.a, pair.b].map((e) => (
                        <div key={e.uid} className="min-w-0 space-y-1">
                          <p className="text-xs font-medium">{e.name}</p>
                          <AnswerView problem={problem} code={e.answer} />
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Read the page docs, then write the page**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`, the `searchParams` section: it is a Promise, and each value is a string, a string[] or undefined.

`src/app/teacher/contests/[contestId]/submissions/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import {
  getContest,
  listParticipants,
  listProblems,
  type ContestProblem,
  type Participant,
} from "@/lib/db/contests";
import { bestSubmissions, listContestSubmissions } from "@/lib/db/contest-submissions";
import { findSimilarPairs } from "@/lib/plagiarism/pairs";
import {
  parseSubmissionsQuery,
  submissionsHref,
  type SubmissionsQuery,
  type SubmissionsTab,
} from "@/lib/submissions-query";
import { isStaff } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SimilarPairs, SubmissionList } from "@/components/teacher/contest-submissions";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 100;
const TABS: [SubmissionsTab, string][] = [
  ["attempts", "Илгээлтүүд"],
  ["similar", "Хуулбар сэжиг"],
];
const SELECT = "border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export default async function ContestSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();

  const [problems, participants] = await Promise.all([
    listProblems(contestId),
    listParticipants(contestId),
  ]);
  const query = parseSubmissionsQuery(await searchParams, {
    studentIds: participants.map((p) => p.uid),
    problemIds: problems.map((p) => p.id),
  });
  const base = `/teacher/contests/${contestId}/submissions`;
  const exportHref = (type: "results" | "attempts") =>
    `/api/teacher/contests/${contestId}/export?type=${type}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-6 p-4 pt-8">
        <div className="space-y-2">
          <Button render={<Link href={`/teacher/contests/${contestId}`} />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Тэмцээн удирдлага
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{contest.title}: илгээлтүүд</h1>
            <div className="flex flex-wrap gap-2">
              <Button render={<a href={exportHref("results")} download />} nativeButton={false} variant="outline" size="sm">
                <Download className="size-3.5" />
                Дүн (CSV)
              </Button>
              <Button render={<a href={exportHref("attempts")} download />} nativeButton={false} variant="outline" size="sm">
                <Download className="size-3.5" />
                Бүх оролдлого (CSV)
              </Button>
            </div>
          </div>
        </div>

        <nav aria-label="Харагдац" className="flex gap-1 border-b">
          {TABS.map(([id, label]) => (
            <Link
              key={id}
              href={submissionsHref(base, { ...query, tab: id, page: 1 })}
              aria-current={query.tab === id ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                query.tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {query.tab === "attempts" ? (
          <AttemptsTab contestId={contestId} base={base} query={query} problems={problems} participants={participants} />
        ) : (
          <SimilarTab contestId={contestId} problems={problems} />
        )}
      </main>
    </div>
  );
}

async function AttemptsTab({
  contestId,
  base,
  query,
  problems,
  participants,
}: {
  contestId: string;
  base: string;
  query: SubmissionsQuery;
  problems: ContestProblem[];
  participants: Participant[];
}) {
  const { rows, total } = await listContestSubmissions(contestId, {
    uid: query.student,
    problemId: query.problem,
    limit: PAGE_SIZE,
    offset: (query.page - 1) * PAGE_SIZE,
  });
  const from = (query.page - 1) * PAGE_SIZE + 1;
  const to = from + rows.length - 1;

  return (
    <div className="space-y-4">
      <form method="get" action={base} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Сурагч</span>
          <select name="student" defaultValue={query.student ?? ""} className={SELECT}>
            <option value="">Бүгд</option>
            {participants.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.name ?? p.email}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Бодлого</span>
          <select name="problem" defaultValue={query.problem ?? ""} className={SELECT}>
            <option value="">Бүгд</option>
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline">
          Шүүх
        </Button>
      </form>

      <SubmissionList rows={rows} problems={problems} />

      {(rows.length > 0 || query.page > 1) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{rows.length > 0 ? `${from}–${to} / ${total}` : `0 / ${total}`}</span>
          <div className="flex gap-4">
            {query.page > 1 && (
              <Link href={submissionsHref(base, { ...query, page: query.page - 1 })} className="hover:text-foreground">
                ← Өмнөх
              </Link>
            )}
            {to < total && rows.length > 0 && (
              <Link href={submissionsHref(base, { ...query, page: query.page + 1 })} className="hover:text-foreground">
                Дараах →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function SimilarTab({ contestId, problems }: { contestId: string; problems: ContestProblem[] }) {
  const best = await bestSubmissions(contestId);
  const groups = problems.map((problem) => ({
    problem,
    ...findSimilarPairs(
      problem.kind,
      best
        .filter((r) => r.problem_id === problem.id)
        .map((r) => ({ uid: r.uid, name: r.name ?? r.email, score: r.score, answer: r.code })),
      { starterCode: problem.starter_code }
    ),
  }));
  return <SimilarPairs groups={groups} />;
}
```

- [ ] **Step 7: Add the «Илгээлтүүд» button to the contest page**

In `src/app/teacher/contests/[contestId]/page.tsx`:

1. Change the lucide import to `import { ArrowLeft, ListChecks, Pencil, Plus, Star, Trophy } from "lucide-react";`.
2. In the «Бодлогууд» `CardHeader`'s `<div className="flex gap-2">`, before the Leaderboard button, insert:

```tsx
                <Button
                  render={<Link href={`/teacher/contests/${contestId}/submissions`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <ListChecks className="size-3.5" />
                  Илгээлтүүд
                </Button>
```

3. Change that `<div className="flex gap-2">` to `<div className="flex flex-wrap gap-2">` so the three buttons wrap on phones.

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npm run lint`
Expected: no tsc output. Lint: 0 errors. The only warnings allowed are the 2 existing `_form` warnings in `src/lib/teacher-actions.ts`.

- [ ] **Step 9: Browser verification with throwaway data**

Create `scripts/.tmp/seed-submissions.ts`:

```ts
import { inArray } from "drizzle-orm";
import { closeDb, getDb } from "@/lib/db/client";
import { contestSubmissions, users } from "@/lib/db/schema";
import { deleteContest, registerParticipant, upsertContest, upsertProblem } from "@/lib/db/contests";

const CONTEST = "zz-demo";
const UIDS = ["zz-s1", "zz-s2", "zz-s3"];
const ORIGINAL = "n = int(input())\ntotal = 0\nfor i in range(n):\n    x = int(input())\n    if x % 2 == 0:\n        total += x\nprint(total)\n";
const RENAMED = "count = int(input())\ns = 0\nfor k in range(count):\n    v = int(input())  # read\n    if v % 2 == 0:\n        s += v\nprint(s)\n";
const UNRELATED = "=cmd|' /C calc'!A0\nword = input()\nif word == word[::-1]:\n    print(\"YES\")\nelse:\n    print(\"NO\")\n" + "# long line ".repeat(40);
const CIRCUIT = (a: string, b: string) =>
  JSON.stringify({
    gates: [
      { id: a, type: "AND", x: 0, y: 0 },
      { id: b, type: "OR", x: 120, y: 0 },
    ],
    wires: [
      { from: "in:A", to: a, port: 0 },
      { from: "in:B", to: a, port: 1 },
      { from: a, to: b, port: 0 },
      { from: "in:C", to: b, port: 1 },
      { from: b, to: "out:Q", port: 0 },
    ],
  });

async function main() {
  const db = getDb();
  await deleteContest(CONTEST);
  await db.delete(users).where(inArray(users.uid, UIDS));
  if (process.argv[2] === "clean") return;

  await upsertContest({ id: CONTEST, title: "ZZ туршилт", description: "", starts_at: Date.now() - 3_600_000, ends_at: Date.now() + 3_600_000 });
  await upsertProblem(CONTEST, { id: "py", title: "Тэгш тоонуудын нийлбэр", prompt: "…", order: 1, points: 100, kind: "python", public_test_cases: [] }, { hidden_test_cases: [] });
  await upsertProblem(
    CONTEST,
    { id: "gate", title: "Хэлхээ", prompt: "…", order: 2, points: 50, kind: "logic", public_test_cases: [], logic_spec: { inputs: ["A", "B", "C"], outputs: ["Q"], allowed_gates: ["AND", "OR"], max_gates: null, table_visible: false } },
    { hidden_test_cases: [] }
  );
  const names = ["Бат", null, "Сараа"];
  for (const [i, uid] of UIDS.entries()) {
    await db.insert(users).values({ uid, email: `${uid}@zz.test`, name: names[i] ?? uid });
    await registerParticipant(CONTEST, { uid, name: names[i], email: `${uid}@zz.test` });
  }
  const at = (m: number) => new Date(Date.now() - (60 - m) * 60_000);
  await db.insert(contestSubmissions).values([
    { contest_id: CONTEST, uid: "zz-s1", problem_id: "py", code: ORIGINAL, score: 100, passed_tests: 3, total_tests: 3, submitted_at: at(1) },
    { contest_id: CONTEST, uid: "zz-s2", problem_id: "py", code: RENAMED, score: 100, passed_tests: 3, total_tests: 3, submitted_at: at(2) },
    { contest_id: CONTEST, uid: "zz-s3", problem_id: "py", code: UNRELATED, score: 0, passed_tests: 0, total_tests: 3, submitted_at: at(3) },
    { contest_id: CONTEST, uid: "zz-s1", problem_id: "gate", code: CIRCUIT("g1", "g2"), score: 50, passed_tests: 8, total_tests: 8, submitted_at: at(4) },
    { contest_id: CONTEST, uid: "zz-s3", problem_id: "gate", code: CIRCUIT("x", "y"), score: 50, passed_tests: 8, total_tests: 8, submitted_at: at(5) },
    { contest_id: CONTEST, uid: "zz-s2", problem_id: "gate", code: "{broken", score: 0, passed_tests: 0, total_tests: 8, submitted_at: at(6) },
  ]);
}

main().finally(closeDb);
```

Run: `npx tsx --env-file=.env.local --conditions=react-server scripts/.tmp/seed-submissions.ts`

Then, in the Browser pane on the running dev server (`preview_start` name `dev`, port 3001). The admin session must already be signed in there; if not, ask the user to sign in, and never inject cookies.

1. `/teacher/contests/zz-demo`: the «Илгээлтүүд» button is there. Click it.
2. The attempts tab shows 6 rows, newest first. The nameless participant shows `zz-s2@zz.test`. Expanding the circuit row shows `Q = (A AND B) OR C` and «2 хаалга». The `{broken` row shows «Хэлхээг уншиж чадсангүй.».
3. Filter student = Бат, then problem = Хэлхээ: 1 row. `?page=abc&student=ghost` shows all 6 rows.
4. The «Хуулбар сэжиг» tab:
   - Python shows one red 100% pair, Бат ↔ zz-s2@zz.test.
   - The circuit problem shows one red 100% pair, Бат ↔ Сараа, the logic warning, and «1 бодолт хэт богино эсвэл уншигдахгүй…».
5. In `javascript_tool`, run:
   ```js
   await fetch('/api/teacher/contests/zz-demo/export?type=attempts').then(async r => ({ status: r.status, type: r.headers.get('content-type'), disp: r.headers.get('content-disposition'), bom: (await r.text()).charCodeAt(0) === 0xFEFF }))
   ```
   Expected: `200`, `text/csv; charset=utf-8`, `attachment; filename="zz-demo-oroldlogo.csv"` and `bom: true`. Repeat with `type=results`, which should give `zz-demo-dun.csv`, and `type=nope`, which should give 400. Check that the text contains `"'=cmd|` (the formula is defused).
6. Check 375px width with `resize_window` preset `mobile`:
   - Expand the UNRELATED row; its long comment line scrolls inside the `<pre>`.
   - `document.documentElement.scrollWidth <= innerWidth` is true.
   - Reset with preset `desktop`.
7. `read_console_messages` onlyErrors shows no new errors. Take a screenshot of the similar tab.

Clean up: `npx tsx --env-file=.env.local --conditions=react-server scripts/.tmp/seed-submissions.ts clean && rm -r scripts/.tmp`

---

### Task 9: Docs and full verification

**Files:**
- Modify: `README.md`, the «Контент нэмэх» list

**Interfaces:**
- Consumes: everything above.
- Produces: docs.

- [ ] **Step 1: Document the page**

In `README.md`, after the `- **Мэдээний ангилал**: …` bullet, add:

```markdown
- **Тэмцээний илгээлтүүд**: `/teacher/contests/<id>` → «Илгээлтүүд». Бүх оролдлогыг сурагч, бодлогоор шүүж харна; «Дүн», «Бүх оролдлого» CSV (Excel). «Хуулбар сэжиг» таб сурагч бүрийн шилдэг бодолтыг харьцуулж ≥70% төстэй хосыг харуулна (Python: токен + winnowing, эхлэлийн код тооцогдохгүй; хэлхээ: бүтцээр). Шийдвэрийг багш гаргана.
```

- [ ] **Step 2: Full suite, typecheck, lint, build**

Run: `npm test 2>&1 | tail -12 && npx tsc --noEmit -p . && npm run lint && npm run build 2>&1 | grep -E "Compiled|rror"`
Expected:
- Tests: all pass. That is 171 existing plus the new ones: 4 + 2 + 8 + 6 + 4 + 5 + 4 + 4 + 4 = 41, so 212 in total, with 0 failing.
- tsc: silent.
- Lint: 0 errors (the 2 known warnings only).
- Build: `✓ Compiled successfully`.
