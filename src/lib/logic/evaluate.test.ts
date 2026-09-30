import { test } from "node:test";
import assert from "node:assert/strict";
import { GATE_TYPES, type GateType } from "@/lib/logic/gates";
import { MALFORMED, type Circuit } from "@/lib/logic/circuit";
import {
  evaluateRow,
  truthTable,
  validateCircuit,
  wouldCreateCycle,
} from "@/lib/logic/evaluate";
import type { LogicSpec } from "@/lib/logic/spec";

const spec: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: [...GATE_TYPES],
  max_gates: null,
  table_visible: true,
};
const gate = (id: string, type: GateType) => ({ id, type, x: 0, y: 0 });
const wire = (from: string, to: string, port = 0) => ({ from, to, port });
const and: Circuit = {
  gates: [gate("g1", "AND")],
  wires: [wire("in:A", "g1", 0), wire("in:B", "g1", 1), wire("g1", "out:Q")],
};
const loop: Circuit = {
  gates: [gate("g1", "OR"), gate("g2", "NOT")],
  wires: [wire("in:A", "g1", 0), wire("g2", "g1", 1), wire("g1", "g2"), wire("g1", "out:Q")],
};

test("an AND circuit gives AND's truth table", () => {
  assert.deepEqual(validateCircuit(and, spec), []);
  assert.deepEqual(truthTable(and, spec), ["0", "0", "0", "1"]);
});

test("a half adder fills both outputs", () => {
  const ha: LogicSpec = { ...spec, outputs: ["S", "C"] };
  const c: Circuit = {
    gates: [gate("x", "XOR"), gate("a", "AND")],
    wires: [
      wire("in:A", "x", 0),
      wire("in:B", "x", 1),
      wire("in:A", "a", 0),
      wire("in:B", "a", 1),
      wire("x", "out:S"),
      wire("a", "out:C"),
    ],
  };
  assert.deepEqual(validateCircuit(c, ha), []);
  assert.deepEqual(truthTable(c, ha), ["00", "10", "10", "01"]);
});

test("NOT chains work and an unused input is fine", () => {
  const c: Circuit = {
    gates: [gate("n1", "NOT"), gate("n2", "NOT")],
    wires: [wire("in:A", "n1"), wire("n1", "n2"), wire("n2", "out:Q")],
  };
  assert.deepEqual(validateCircuit(c, spec), []);
  assert.deepEqual(truthTable(c, spec), ["0", "0", "1", "1"]);
});

test("a gate that feeds nothing is allowed", () => {
  const c: Circuit = {
    gates: [...and.gates, gate("g2", "OR")],
    wires: [...and.wires, wire("in:A", "g2", 0), wire("in:B", "g2", 1)],
  };
  assert.deepEqual(validateCircuit(c, spec), []);
});

test("disallowed gates are reported once per type with every offender", () => {
  const c: Circuit = { gates: [gate("g1", "AND"), gate("g2", "AND"), gate("g3", "NAND")], wires: [] };
  assert.deepEqual(validateCircuit(c, { ...spec, allowed_gates: ["NAND"] })[0], {
    message: "AND хаалга энэ бодлогод зөвшөөрөгдөөгүй.",
    gateIds: ["g1", "g2"],
  });
});

test("too many gates", () => {
  const c: Circuit = { gates: [...and.gates, gate("g2", "NOT")], wires: [...and.wires, wire("in:A", "g2")] };
  assert.deepEqual(validateCircuit(c, { ...spec, max_gates: 1 }), [
    { message: "Хаалга хэт олон байна: 2 / 1." },
  ]);
});

test("wires with impossible ends are malformed", () => {
  const bad = [
    wire("g9", "out:Q"),
    wire("in:A", "g9"),
    wire("out:Q", "g1"),
    wire("g1", "in:A"),
    wire("in:Z", "g1"),
    wire("g1", "out:Z"),
    wire("g1", "out:Q", 1),
  ];
  for (const w of bad) {
    assert.deepEqual(validateCircuit({ ...and, wires: [...and.wires, w] }, spec), [{ message: MALFORMED }], JSON.stringify(w));
  }
  const not: Circuit = { gates: [gate("n", "NOT")], wires: [wire("in:A", "n", 1)] };
  assert.deepEqual(validateCircuit(not, spec), [{ message: MALFORMED }]);
});

test("two wires into one input", () => {
  assert.deepEqual(validateCircuit({ ...and, wires: [...and.wires, wire("in:A", "g1", 1)] }, spec), [
    { message: "Нэг оролтод хоёр утас холбогдсон байна.", gateIds: ["g1"] },
  ]);
  assert.deepEqual(validateCircuit({ ...and, wires: [...and.wires, wire("in:A", "out:Q")] }, spec), [
    { message: "Нэг оролтод хоёр утас холбогдсон байна." },
  ]);
});

test("unwired gate inputs and outputs are named", () => {
  const c: Circuit = {
    gates: [gate("g1", "AND"), gate("g2", "AND")],
    wires: [wire("in:A", "g1", 0), wire("g1", "g2", 0), wire("g1", "g2", 1)],
  };
  assert.deepEqual(validateCircuit(c, spec), [
    { message: "AND хаалганы оролт холбогдоогүй байна.", gateIds: ["g1"] },
    { message: "Q гаралт холбогдоогүй байна." },
  ]);
});

test("a loop is reported with its gates", () => {
  assert.deepEqual(validateCircuit(loop, spec), [
    {
      message: "Хэлхээнд гогцоо байна — хаалганы гаралт өөрийнхөө оролт руу буцаж орсон.",
      gateIds: ["g1", "g2"],
    },
  ]);
});

test("evaluateRow gives null where a signal is undecidable", () => {
  const c: Circuit = {
    gates: [gate("g1", "AND"), gate("g2", "NOT")],
    wires: [wire("in:A", "g1", 0), wire("in:B", "g2"), wire("g1", "out:Q")],
  };
  const v = evaluateRow(c, spec, [1, 0]);
  assert.equal(v.get("in:A"), 1);
  assert.equal(v.get("g2"), 1);
  assert.equal(v.get("g1"), null);
  assert.equal(v.get("out:Q"), null);

  const l = evaluateRow(loop, spec, [1, 1]);
  assert.equal(l.get("g1"), null);
  assert.equal(l.get("g2"), null);
  assert.equal(l.get("out:Q"), null);
});

test("wouldCreateCycle follows existing wires", () => {
  const c: Circuit = {
    gates: [gate("g1", "NOT"), gate("g2", "NOT"), gate("g3", "NOT")],
    wires: [wire("g1", "g2"), wire("g2", "g3")],
  };
  assert.equal(wouldCreateCycle(c, "g3", "g1"), true);
  assert.equal(wouldCreateCycle(c, "g1", "g1"), true);
  assert.equal(wouldCreateCycle(c, "g1", "g3"), false);
  assert.equal(wouldCreateCycle(c, "in:A", "g1"), false);
});
