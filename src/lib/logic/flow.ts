import type { GateType } from "@/lib/logic/gates";
import { inputId, outputId, type Circuit } from "@/lib/logic/circuit";
import type { LogicSpec } from "@/lib/logic/spec";

export type FlowNodeData =
  | { kind: "input"; name: string }
  | { kind: "output"; name: string }
  | { kind: "gate"; gate: GateType };

/** Not React Flow's built-in "input"/"output" types, which bring their own node CSS. */
export type FlowNodeType = "logicIn" | "logicOut" | "logicGate";

/** Structurally a React Flow Node<FlowNodeData> / Edge, without importing React Flow. */
export type FlowNode = {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
  draggable?: boolean;
  deletable?: boolean;
};

export type FlowEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export const TERMINAL_GAP = 90;
export const OUTPUT_X = 640;

/** One wire per gate input, so the input identifies the wire. */
export const edgeId = (target: string, port: number) => `${target}#${port}`;

/** Inputs down the left edge, outputs down the right, centred on each other. */
export function terminalNodes(spec: LogicSpec): FlowNode[] {
  const inputs: FlowNode[] = spec.inputs.map((name, i) => ({
    id: inputId(name),
    type: "logicIn",
    position: { x: 0, y: i * TERMINAL_GAP },
    data: { kind: "input", name },
    draggable: false,
    deletable: false,
  }));
  const offset = ((spec.inputs.length - spec.outputs.length) * TERMINAL_GAP) / 2;
  const outputs: FlowNode[] = spec.outputs.map((name, i) => ({
    id: outputId(name),
    type: "logicOut",
    position: { x: OUTPUT_X, y: offset + i * TERMINAL_GAP },
    data: { kind: "output", name },
    draggable: false,
    deletable: false,
  }));
  return [...inputs, ...outputs];
}

/**
 * A saved circuit as editor nodes and edges. Terminals always come from
 * the current spec: wires to terminals it no longer has are dropped, and
 * repeated wires into one input keep only the first.
 */
export function circuitToFlow(circuit: Circuit, spec: LogicSpec): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [
    ...terminalNodes(spec),
    ...circuit.gates.map((g): FlowNode => ({
      id: g.id,
      type: "logicGate",
      position: { x: g.x, y: g.y },
      data: { kind: "gate", gate: g.type },
    })),
  ];
  const ids = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  const edges: FlowEdge[] = [];
  for (const w of circuit.wires) {
    const id = edgeId(w.to, w.port);
    if (!ids.has(w.from) || !ids.has(w.to) || seen.has(id)) continue;
    seen.add(id);
    edges.push({ id, source: w.from, sourceHandle: "out", target: w.to, targetHandle: `in${w.port}` });
  }
  return { nodes, edges };
}

export function flowToCircuit(
  nodes: readonly { id: string; position: { x: number; y: number }; data: FlowNodeData }[],
  edges: readonly { source: string; target: string; targetHandle?: string | null }[]
): Circuit {
  return {
    gates: nodes.flatMap((n) =>
      n.data.kind === "gate"
        ? [{ id: n.id, type: n.data.gate, x: Math.round(n.position.x), y: Math.round(n.position.y) }]
        : []
    ),
    wires: edges.map((e) => ({
      from: e.source,
      to: e.target,
      port: Number(e.targetHandle?.slice(2) || 0),
    })),
  };
}

export function nextGateId(nodes: readonly { id: string }[]): string {
  let max = 0;
  for (const n of nodes) {
    const m = /^g(\d+)$/.exec(n.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `g${max + 1}`;
}
