import { test } from "node:test";
import assert from "node:assert/strict";
import type { Circuit } from "@/lib/logic/circuit";
import { circuitFormulas } from "@/lib/logic/formula";

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

test("one formula per output, outer brackets dropped", () => {
  assert.deepEqual(circuitFormulas(ONE, ["Q"]), ["Q = (A AND B) OR NOT C"]);
});

test("NOT puts a compound input in brackets", () => {
  assert.deepEqual(circuitFormulas(THREE, ["Q"]), ["Q = NOT ((A NAND B) XOR C)"]);
});

test("unconnected inputs and outputs show ?", () => {
  const half: Circuit = {
    gates: [{ id: "g", type: "AND", x: 0, y: 0 }],
    wires: [
      { from: "in:A", to: "g", port: 0 },
      { from: "g", to: "out:Q", port: 0 },
    ],
  };
  assert.deepEqual(circuitFormulas(half, ["Q", "R"]), ["Q = A AND ?", "R = ?"]);
});

test("a loop shows … instead of hanging", () => {
  assert.deepEqual(circuitFormulas(LOOP, ["Q"]), ["Q = (… AND ?) OR ?"]);
});
