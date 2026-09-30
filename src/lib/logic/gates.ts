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
