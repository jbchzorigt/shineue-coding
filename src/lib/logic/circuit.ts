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
