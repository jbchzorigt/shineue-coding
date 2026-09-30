import { applyGate, type Bit, type GateType } from "@/lib/logic/gates";
import { rowInputs, type LogicSpec, type TruthTable } from "@/lib/logic/spec";

type BinaryGate = Exclude<GateType, "NOT">;

export type Expr =
  | { kind: "var"; name: string }
  | { kind: "not"; arg: Expr }
  | { kind: "bin"; op: BinaryGate; left: Expr; right: Expr };

type Token =
  | { kind: "word"; text: string; pos: number }
  | { kind: "lparen"; pos: number }
  | { kind: "rparen"; pos: number };

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
