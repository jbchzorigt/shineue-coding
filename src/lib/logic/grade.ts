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
