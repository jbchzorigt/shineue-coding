import { test } from "node:test";
import assert from "node:assert/strict";
import { applyGate, gateArity, GATE_TYPES, isGateType, type Bit, type GateType } from "@/lib/logic/gates";

// Outputs for (a, b) = 00, 01, 10, 11; NOT ignores b.
const TRUTH: Record<GateType, string> = {
  AND: "0001",
  OR: "0111",
  NOT: "1100",
  NAND: "1110",
  NOR: "1000",
  XOR: "0110",
  XNOR: "1001",
};
const PAIRS: [Bit, Bit][] = [[0, 0], [0, 1], [1, 0], [1, 1]];

test("every gate matches its truth table", () => {
  for (const type of GATE_TYPES) {
    assert.equal(PAIRS.map(([a, b]) => applyGate(type, a, b)).join(""), TRUTH[type], type);
  }
});

test("NOT takes one input, the rest two", () => {
  for (const type of GATE_TYPES) assert.equal(gateArity(type), type === "NOT" ? 1 : 2, type);
});

test("isGateType accepts only the seven names", () => {
  assert.equal(isGateType("NAND"), true);
  for (const bad of ["nand", "BUF", "", 1, null, undefined]) assert.equal(isGateType(bad), false);
});
