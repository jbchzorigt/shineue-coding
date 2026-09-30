"use client";

import { createContext, useContext, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RotateCcw, Trash2 } from "lucide-react";
import { evaluateRow } from "@/lib/logic/evaluate";
import { gateArity, type Bit, type GateType } from "@/lib/logic/gates";
import type { LogicSpec } from "@/lib/logic/spec";
import { GateSymbol } from "@/components/logic/gate-symbol";
import type { CircuitNode, CircuitState } from "@/components/logic/use-circuit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditorContextValue {
  signals: Map<string, Bit | null>;
  errorIds: ReadonlySet<string>;
  toggleInput: (name: string) => void;
}

const EditorContext = createContext<EditorContextValue>({
  signals: new Map(),
  errorIds: new Set(),
  toggleInput: () => {},
});

function InputNode({ id, data }: NodeProps<CircuitNode>) {
  const { signals, toggleInput } = useContext(EditorContext);
  if (data.kind !== "input") return null;
  const on = signals.get(id) === 1;
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm">
      <span className="font-mono text-sm font-bold">{data.name}</span>
      <button
        type="button"
        onClick={() => toggleInput(data.name)}
        className={cn(
          "nodrag w-8 rounded px-1 py-0.5 font-mono text-xs font-semibold",
          on ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
        )}
        aria-label={`${data.name} оролтыг солих`}
      >
        {on ? 1 : 0}
      </button>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

function OutputNode({ id, data }: NodeProps<CircuitNode>) {
  const { signals } = useContext(EditorContext);
  if (data.kind !== "output") return null;
  const value = signals.get(id);
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm">
      <Handle type="target" position={Position.Left} id="in0" />
      <span
        className={cn(
          "size-4 rounded-full border",
          value === 1 ? "border-amber-500 bg-amber-400 shadow-[0_0_10px] shadow-amber-400" : "bg-muted"
        )}
        aria-hidden
      />
      <span className="font-mono text-sm font-bold">{data.name}</span>
      <span className="sr-only">{value === null || value === undefined ? "тодорхойгүй" : value}</span>
    </div>
  );
}

function GateNode({ id, data, selected }: NodeProps<CircuitNode>) {
  const { errorIds } = useContext(EditorContext);
  if (data.kind !== "gate") return null;
  return (
    <div
      className={cn(
        "relative",
        errorIds.has(id) ? "text-red-600" : selected ? "text-sky-600" : "text-foreground"
      )}
    >
      <GateSymbol type={data.gate} className="h-12 w-18" />
      {gateArity(data.gate) === 2 ? (
        <>
          <Handle type="target" position={Position.Left} id="in0" style={{ top: "30%" }} />
          <Handle type="target" position={Position.Left} id="in1" style={{ top: "70%" }} />
        </>
      ) : (
        <Handle type="target" position={Position.Left} id="in0" />
      )}
      <Handle type="source" position={Position.Right} id="out" />
      <span className="pointer-events-none absolute inset-x-0 -bottom-3.5 text-center font-mono text-[10px] text-muted-foreground">
        {data.gate}
      </span>
    </div>
  );
}

const nodeTypes: NodeTypes = { logicIn: InputNode, logicOut: OutputNode, logicGate: GateNode };

/** Wire colour follows the live signal; selection keeps React Flow's own colour variable. */
function wireStyle(value: Bit | null | undefined): CSSProperties {
  return {
    "--xy-edge-stroke": value === 1 ? "#16a34a" : "#a1a1aa",
    "--xy-edge-stroke-width": value === 1 ? 2.5 : 2,
    strokeDasharray: value === 0 || value === 1 ? undefined : "4 4",
  } as CSSProperties;
}

export function CircuitEditor(props: {
  spec: LogicSpec;
  state: CircuitState;
  errorIds: ReadonlySet<string>;
}) {
  return (
    <ReactFlowProvider>
      <EditorCanvas {...props} />
    </ReactFlowProvider>
  );
}

function EditorCanvas({
  spec,
  state,
  errorIds,
}: {
  spec: LogicSpec;
  state: CircuitState;
  errorIds: ReadonlySet<string>;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [bits, setBits] = useState<Record<string, Bit>>({});
  const signals = useMemo(
    () => evaluateRow(state.circuit, spec, spec.inputs.map((n) => bits[n] ?? 0)),
    [state.circuit, spec, bits]
  );
  const context = useMemo<EditorContextValue>(
    () => ({
      signals,
      errorIds,
      toggleInput: (name) => setBits((b) => ({ ...b, [name]: b[name] === 1 ? 0 : 1 })),
    }),
    [signals, errorIds]
  );
  const edges = state.edges.map((e) => ({ ...e, style: wireStyle(signals.get(e.source)) }));
  const full = state.gateCount >= state.gateLimit;

  function add(gate: GateType) {
    const rect = wrapper.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
      : { x: 300, y: 100 };
    // Nudge each new gate so repeated clicks don't stack exactly.
    const nudge = (state.gateCount % 5) * 16;
    state.addGate(gate, { x: center.x - 36 + nudge, y: center.y - 24 + nudge });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/60 px-2 py-1.5">
        {spec.allowed_gates.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => add(g)}
            disabled={full}
            title={`${g} нэмэх`}
            className="flex items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-xs font-medium hover:bg-accent disabled:opacity-40"
          >
            <GateSymbol type={g} className="h-5 w-7.5" />
            {g}
          </button>
        ))}
        <span className={cn("ml-auto text-xs", full ? "font-medium text-amber-700" : "text-muted-foreground")}>
          Хаалга: {state.gateCount}
          {spec.max_gates !== null ? ` / ${spec.max_gates}` : ""}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={state.deleteSelected}
          title="Сонгосныг устгах"
          aria-label="Сонгосныг устгах"
        >
          <Trash2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            if (confirm("Бүх хаалга, утсыг арилгах уу?")) state.clear();
          }}
          title="Цэвэрлэх"
          aria-label="Цэвэрлэх"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
      <div ref={wrapper} className="min-h-0 flex-1">
        <EditorContext value={context}>
          <ReactFlow
            nodes={state.nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={state.onNodesChange}
            onEdgesChange={state.onEdgesChange}
            onConnect={state.onConnect}
            isValidConnection={state.isValidConnection}
            deleteKeyCode={["Backspace", "Delete"]}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            style={{ "--xy-edge-stroke-selected": "#0284c7" } as CSSProperties}
          >
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </EditorContext>
      </div>
    </div>
  );
}
