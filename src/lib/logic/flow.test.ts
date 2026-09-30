import { test } from "node:test";
import assert from "node:assert/strict";
import { GATE_TYPES } from "@/lib/logic/gates";
import type { Circuit } from "@/lib/logic/circuit";
import { circuitToFlow, flowToCircuit, nextGateId, terminalNodes } from "@/lib/logic/flow";
import type { LogicSpec } from "@/lib/logic/spec";

const spec: LogicSpec = {
  inputs: ["A", "B", "C"],
  outputs: ["Q"],
  allowed_gates: [...GATE_TYPES],
  max_gates: null,
  table_visible: true,
};

test("terminalNodes pins inputs left and outputs right, centred, and locked", () => {
  assert.deepEqual(
    terminalNodes(spec).map((n) => [n.id, n.type, n.position.x, n.position.y, n.draggable, n.deletable]),
    [
      ["in:A", "logicIn", 0, 0, false, false],
      ["in:B", "logicIn", 0, 90, false, false],
      ["in:C", "logicIn", 0, 180, false, false],
      ["out:Q", "logicOut", 640, 90, false, false],
    ]
  );
});

test("circuitToFlow and flowToCircuit round-trip", () => {
  const circuit: Circuit = {
    gates: [{ id: "g1", type: "AND", x: 200, y: 40 }],
    wires: [
      { from: "in:A", to: "g1", port: 0 },
      { from: "in:B", to: "g1", port: 1 },
      { from: "g1", to: "out:Q", port: 0 },
    ],
  };
  const { nodes, edges } = circuitToFlow(circuit, spec);
  assert.deepEqual(edges[1], { id: "g1#1", source: "in:B", sourceHandle: "out", target: "g1", targetHandle: "in1" });
  assert.deepEqual(nodes.find((n) => n.id === "g1")?.type, "logicGate");
  assert.deepEqual(flowToCircuit(nodes, edges), circuit);
});

test("circuitToFlow drops wires to terminals the spec no longer has and keeps disallowed gates", () => {
  const circuit: Circuit = {
    gates: [{ id: "g1", type: "XOR", x: 0, y: 0 }],
    wires: [
      { from: "in:Z", to: "g1", port: 0 },
      { from: "g1", to: "out:Q", port: 0 },
      { from: "g1", to: "out:Q", port: 0 },
    ],
  };
  const { nodes, edges } = circuitToFlow(circuit, { ...spec, allowed_gates: ["AND"] });
  assert.ok(nodes.some((n) => n.id === "g1"));
  assert.deepEqual(edges.map((e) => e.id), ["out:Q#0"]);
});

test("flowToCircuit rounds dragged positions", () => {
  const nodes = [{ id: "g1", position: { x: 10.6, y: -3.2 }, data: { kind: "gate" as const, gate: "OR" as const } }];
  assert.deepEqual(flowToCircuit(nodes, []).gates, [{ id: "g1", type: "OR", x: 11, y: -3 }]);
});

test("nextGateId continues after the highest g<number>", () => {
  assert.equal(nextGateId([{ id: "in:A" }, { id: "g2" }, { id: "g10" }, { id: "gx" }]), "g11");
  assert.equal(nextGateId([]), "g1");
});
