"use client";

import { useMemo, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import type { Circuit } from "@/lib/logic/circuit";
import { wouldCreateCycle } from "@/lib/logic/evaluate";
import {
  circuitToFlow,
  edgeId,
  flowToCircuit,
  nextGateId,
  terminalNodes,
  type FlowNodeData,
} from "@/lib/logic/flow";
import type { GateType } from "@/lib/logic/gates";
import { MAX_GATES, type LogicSpec } from "@/lib/logic/spec";

export type CircuitNode = Node<FlowNodeData>;

/** Editor state, lifted so the solver can read the circuit for Run/Submit. */
export function useCircuit(spec: LogicSpec, initial: Circuit | null) {
  const [start] = useState(() =>
    initial ? circuitToFlow(initial, spec) : { nodes: terminalNodes(spec), edges: [] }
  );
  const [nodes, setNodes] = useState<CircuitNode[]>(start.nodes);
  const [edges, setEdges] = useState<Edge[]>(start.edges);
  const circuit = useMemo(() => flowToCircuit(nodes, edges), [nodes, edges]);
  const gateCount = circuit.gates.length;
  const gateLimit = Math.min(spec.max_gates ?? MAX_GATES, MAX_GATES);

  function onNodesChange(changes: NodeChange<CircuitNode>[]) {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }

  function onEdgesChange(changes: EdgeChange[]) {
    setEdges((es) => applyEdgeChanges(changes, es));
  }

  function isValidConnection(c: Connection | Edge): boolean {
    return Boolean(c.source && c.target) && !wouldCreateCycle(circuit, c.source, c.target);
  }

  function onConnect(c: Connection) {
    if (!isValidConnection(c)) return;
    const port = Number(c.targetHandle?.slice(2) || 0);
    const id = edgeId(c.target, port);
    // One wire per input: a new wire replaces the old one.
    setEdges((es) => [
      ...es.filter((e) => e.id !== id),
      { id, source: c.source, sourceHandle: "out", target: c.target, targetHandle: `in${port}` },
    ]);
  }

  function addGate(gate: GateType, position: { x: number; y: number }) {
    if (gateCount >= gateLimit) return;
    setNodes((ns) => [
      ...ns,
      { id: nextGateId(ns), type: "logicGate", position, data: { kind: "gate", gate } },
    ]);
  }

  function deleteSelected() {
    const removed = new Set(
      nodes.filter((n) => n.selected && n.data.kind === "gate").map((n) => n.id)
    );
    setNodes((ns) => ns.filter((n) => !removed.has(n.id)));
    setEdges((es) =>
      es.filter((e) => !e.selected && !removed.has(e.source) && !removed.has(e.target))
    );
  }

  function clear() {
    setNodes(terminalNodes(spec));
    setEdges([]);
  }

  return {
    nodes,
    edges,
    circuit,
    gateCount,
    gateLimit,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
    addGate,
    deleteSelected,
    clear,
  };
}

export type CircuitState = ReturnType<typeof useCircuit>;
