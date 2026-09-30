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
