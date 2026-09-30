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
