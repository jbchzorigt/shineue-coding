import { test } from "node:test";
import assert from "node:assert/strict";
import type { GateType } from "@/lib/logic/gates";
import { MALFORMED, type Circuit } from "@/lib/logic/circuit";
import { gradeLogic } from "@/lib/logic/grade";
import type { LogicSpec } from "@/lib/logic/spec";

const spec: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: ["AND", "OR"],
  max_gates: null,
  table_visible: false,
};
const expected = ["0", "0", "0", "1"];
const circuitOf = (type: GateType): Circuit => ({
  gates: [{ id: "g1", type, x: 0, y: 0 }],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "g1", to: "out:Q", port: 0 },
  ],
});

test("a correct circuit gets every row", () => {
  const r = gradeLogic(spec, expected, circuitOf("AND"));
  assert.equal(r.status, "graded");
  if (r.status !== "graded") return;
  assert.deepEqual([r.correctRows, r.totalRows, r.table], [4, 4, expected]);
  assert.deepEqual(r.circuit, circuitOf("AND"));
});

test("a wrong circuit gets the rows it matches", () => {
  const r = gradeLogic(spec, expected, JSON.stringify(circuitOf("OR")));
  assert.equal(r.status === "graded" && r.correctRows, 2);
});

test("a structurally broken circuit is invalid, not graded", () => {
  const broken: Circuit = { ...circuitOf("AND"), wires: [{ from: "in:A", to: "g1", port: 0 }] };
  const r = gradeLogic(spec, expected, broken);
  assert.equal(r.status, "invalid");
  assert.equal(r.status === "invalid" && r.errors.length > 0, true);
});

test("garbage is malformed", () => {
  assert.deepEqual(gradeLogic(spec, expected, "{"), { status: "malformed", message: MALFORMED });
});
