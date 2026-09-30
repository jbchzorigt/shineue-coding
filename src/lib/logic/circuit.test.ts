import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MALFORMED,
  MAX_CIRCUIT_JSON,
  MAX_WIRES,
  parseCircuit,
  type Circuit,
} from "@/lib/logic/circuit";
import { MAX_GATES } from "@/lib/logic/spec";

const good: Circuit = {
  gates: [{ id: "g1", type: "AND", x: 10, y: -20 }],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "g1", to: "out:Q", port: 0 },
  ],
};
const fail = { ok: false, message: MALFORMED };

test("parseCircuit accepts objects and JSON strings", () => {
  assert.deepEqual(parseCircuit(good), { ok: true, circuit: good });
  assert.deepEqual(parseCircuit(JSON.stringify(good)), { ok: true, circuit: good });
});

test("parseCircuit keeps only known fields and rounds positions", () => {
  const messy = {
    extra: 1,
    gates: [{ id: "g1", type: "AND", x: 10.4, y: -19.6, color: "red" }],
    wires: [{ from: "in:A", to: "g1", port: 0, note: "x" }],
  };
  assert.deepEqual(parseCircuit(messy), {
    ok: true,
    circuit: {
      gates: [{ id: "g1", type: "AND", x: 10, y: -20 }],
      wires: [{ from: "in:A", to: "g1", port: 0 }],
    },
  });
});

test("parseCircuit rejects anything malformed", () => {
  const g = good.gates[0];
  const bad: unknown[] = [
    null,
    42,
    "not json",
    "[]",
    { gates: [] },
    { wires: [] },
    { gates: [{ ...g, type: "BUF" }], wires: [] },
    { gates: [{ ...g, id: "G1" }], wires: [] },
    { gates: [g, g], wires: [] },
    { gates: [{ ...g, x: Number.NaN }], wires: [] },
    { gates: [{ ...g, y: 1e6 }], wires: [] },
    { gates: [g], wires: [{ from: "in:A", to: "g1", port: 2 }] },
    { gates: [g], wires: [{ from: "in:a", to: "g1", port: 0 }] },
    { gates: [g], wires: [{ from: "in:A", to: "g1" }] },
    { gates: Array.from({ length: MAX_GATES + 1 }, (_, i) => ({ ...g, id: `g${i}` })), wires: [] },
    {
      gates: [],
      wires: Array.from({ length: MAX_WIRES + 1 }, () => ({ from: "in:A", to: "out:Q", port: 0 })),
    },
    "x".repeat(MAX_CIRCUIT_JSON + 1),
  ];
  for (const raw of bad) {
    assert.deepEqual(parseCircuit(raw), fail, String(JSON.stringify(raw)).slice(0, 80));
  }
});
