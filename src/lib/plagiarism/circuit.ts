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
