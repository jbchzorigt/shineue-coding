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
