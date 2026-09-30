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
