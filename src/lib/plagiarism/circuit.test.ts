import { test } from "node:test";
import assert from "node:assert/strict";
import type { Circuit } from "@/lib/logic/circuit";
import { circuitShape, compareShapes } from "@/lib/plagiarism/circuit";

// Q = (A AND B) OR NOT C
const ONE: Circuit = {
  gates: [
    { id: "g1", type: "AND", x: 0, y: 0 },
    { id: "g2", type: "NOT", x: 0, y: 80 },
    { id: "g3", type: "OR", x: 150, y: 40 },
  ],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "in:C", to: "g2", port: 0 },
    { from: "g1", to: "g3", port: 0 },
    { from: "g2", to: "g3", port: 1 },
    { from: "g3", to: "out:Q", port: 0 },
  ],
};
// The same circuit: other ids, other positions, AND/OR inputs swapped.
const TWO: Circuit = {
  gates: [
    { id: "n", type: "NOT", x: 500, y: 500 },
    { id: "or1", type: "OR", x: 10, y: 10 },
    { id: "and1", type: "AND", x: 90, y: 300 },
  ],
  wires: [
    { from: "in:B", to: "and1", port: 0 },
    { from: "in:A", to: "and1", port: 1 },
    { from: "in:C", to: "n", port: 0 },
    { from: "n", to: "or1", port: 0 },
    { from: "and1", to: "or1", port: 1 },
    { from: "or1", to: "out:Q", port: 0 },
  ],
};
// Q = NOT ((A NAND B) XOR C)
const THREE: Circuit = {
  gates: [
    { id: "a", type: "NAND", x: 0, y: 0 },
    { id: "b", type: "XOR", x: 0, y: 0 },
    { id: "c", type: "NOT", x: 0, y: 0 },
  ],
  wires: [
    { from: "in:A", to: "a", port: 0 },
    { from: "in:B", to: "a", port: 1 },
    { from: "a", to: "b", port: 0 },
    { from: "in:C", to: "b", port: 1 },
    { from: "b", to: "c", port: 0 },
    { from: "c", to: "out:Q", port: 0 },
  ],
};
const LOOP: Circuit = {
  gates: [
    { id: "p", type: "AND", x: 0, y: 0 },
    { id: "q", type: "OR", x: 0, y: 0 },
  ],
  wires: [
    { from: "q", to: "p", port: 0 },
    { from: "p", to: "q", port: 0 },
    { from: "q", to: "out:Q", port: 0 },
  ],
};
const shape = (c: Circuit) => {
  const s = circuitShape(JSON.stringify(c));
  assert.ok(s, "expected a comparable circuit");
  return s;
};

test("the shape lists every gate by what feeds it, plus every output", () => {
  assert.deepEqual(Object.fromEntries(shape(ONE)), {
    "AND(A,B)": 1,
    "NOT(C)": 1,
    "OR(AND(A,B),NOT(C))": 1,
    "Q=OR(AND(A,B),NOT(C))": 1,
  });
});

test("ids, positions and the order of a gate's inputs do not matter", () => {
  assert.equal(compareShapes(shape(ONE), shape(TWO)), 1);
});

test("a different circuit scores low", () => {
  assert.ok(compareShapes(shape(ONE), shape(THREE)) < 0.7);
});

test("gate names stop after three levels", () => {
  const chain: Circuit = {
    gates: ["n1", "n2", "n3", "n4", "n5"].map((id) => ({ id, type: "NOT" as const, x: 0, y: 0 })),
    wires: [
      { from: "in:A", to: "n1", port: 0 },
      { from: "n1", to: "n2", port: 0 },
      { from: "n2", to: "n3", port: 0 },
      { from: "n3", to: "n4", port: 0 },
      { from: "n4", to: "n5", port: 0 },
      { from: "n5", to: "out:Q", port: 0 },
    ],
  };
  assert.deepEqual(Object.fromEntries(shape(chain)), {
    "NOT(A)": 1,
    "NOT(NOT(A))": 1,
    "NOT(NOT(NOT(A)))": 1,
    "NOT(NOT(NOT(NOT)))": 2,
    "Q=NOT(NOT(NOT(NOT)))": 1,
  });
});

test("a loop is marked instead of hanging; loose inputs show ?", () => {
  assert.deepEqual(Object.fromEntries(shape(LOOP)), {
    "AND(?,OR(?,…))": 1,
    "OR(?,AND(?,…))": 1,
    "Q=OR(?,AND(?,…))": 1,
  });
});

test("circuits under two gates, and unreadable answers, are not compared", () => {
  const single: Circuit = { gates: [{ id: "g", type: "AND", x: 0, y: 0 }], wires: [] };
  assert.equal(circuitShape(JSON.stringify(single)), null);
  assert.equal(circuitShape("{broken"), null);
  assert.equal(compareShapes(new Map(), new Map()), 0);
});
