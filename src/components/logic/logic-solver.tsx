"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CheckCircle2, ChevronRight, Loader2, Play, Send, Table2 } from "lucide-react";
import type { Circuit } from "@/lib/logic/circuit";
import { truthTable, validateCircuit, type LogicError } from "@/lib/logic/evaluate";
import { rowInputs, type LogicSpec, type TruthTable } from "@/lib/logic/spec";
import { useCircuit } from "@/components/logic/use-circuit";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { LogicResultDto } from "@/app/api/challenges/[challengeId]/submit/route";

// React Flow measures the DOM, so the canvas renders on the client only.
const CircuitEditor = dynamic(
  () => import("@/components/logic/circuit-editor").then((m) => m.CircuitEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Editor ачаалж байна…
      </div>
    ),
  }
);

export type SolverTarget =
  | { kind: "challenge"; challengeId: string; alreadyPassed: boolean }
  | { kind: "contest"; contestId: string; problemId: string; disabled: boolean };

type Outcome =
  | { kind: "challenge"; xpAwarded: number; unlockedModule: { id: string; title: string } | null }
  | { kind: "contest"; score: number; bestScore: number; improved: boolean; maxPoints: number };

interface Graded {
  correctRows: number;
  totalRows: number;
  outcome: Outcome;
}

type PanelState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "message"; message: string }
  | { kind: "invalid"; errors: LogicError[] }
  | { kind: "table"; table: TruthTable; graded?: Graded };

interface SubmitResponse {
  message?: string;
  logic?: LogicResultDto;
  xpAwarded?: number;
  unlockedModule?: { id: string; title: string } | null;
  score?: number;
  bestScore?: number;
  improved?: boolean;
  maxPoints?: number;
}

export function LogicSolver({
  spec,
  expected,
  initialCircuit,
  target,
}: {
  spec: LogicSpec;
  /** Only when the problem shows its table; hidden tables never reach the client. */
  expected: TruthTable | null;
  initialCircuit: Circuit | null;
  target: SolverTarget;
}) {
  const state = useCircuit(spec, initialCircuit);
  const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
  const errorIds = useMemo(
    () => new Set(panel.kind === "invalid" ? panel.errors.flatMap((e) => e.gateIds ?? []) : []),
    [panel]
  );
  const busy = panel.kind === "busy";
  const locked = target.kind === "contest" && target.disabled;

  function run() {
    const errors = validateCircuit(state.circuit, spec);
    setPanel(
      errors.length > 0
        ? { kind: "invalid", errors }
        : { kind: "table", table: truthTable(state.circuit, spec) }
    );
  }

  async function submit() {
    const circuit = state.circuit;
    setPanel({ kind: "busy" });
    const url =
      target.kind === "challenge"
        ? `/api/challenges/${target.challengeId}/submit`
        : `/api/contests/${target.contestId}/problems/${target.problemId}/submit`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target.kind === "challenge" ? { circuit, mode: "submit" } : { circuit }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (!res.ok || !data.logic) {
        setPanel({ kind: "message", message: data.message ?? "Алдаа гарлаа. Дахин оролдоно уу." });
        return;
      }
      if (data.logic.errors?.length) {
        setPanel({ kind: "invalid", errors: data.logic.errors });
        return;
      }
      const outcome: Outcome =
        target.kind === "challenge"
          ? { kind: "challenge", xpAwarded: data.xpAwarded ?? 0, unlockedModule: data.unlockedModule ?? null }
          : {
              kind: "contest",
              score: data.score ?? 0,
              bestScore: data.bestScore ?? 0,
              improved: data.improved ?? false,
              maxPoints: data.maxPoints ?? 0,
            };
      setPanel({
        kind: "table",
        table: truthTable(circuit, spec),
        graded: { correctRows: data.logic.correctRows, totalRows: data.logic.totalRows, outcome },
      });
    } catch {
      setPanel({ kind: "message", message: "Сервертэй холбогдож чадсангүй." });
    }
  }

  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize="62%" minSize="30%">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Хэлхээ</span>
            <div className="flex items-center gap-2">
              {target.kind === "challenge" && target.alreadyPassed && (
                <span className="mr-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="size-3.5" />
                  Бодсон
                </span>
              )}
              <Button onClick={run} disabled={busy} variant="outline" size="sm">
                <Play className="size-3.5" />
                Ажиллуулах
              </Button>
              <Button onClick={submit} disabled={busy || locked} size="sm">
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Илгээх
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <CircuitEditor spec={spec} state={state} errorIds={errorIds} />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize="38%" minSize="15%">
        <ResultsPanel spec={spec} expected={expected} panel={panel} target={target} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function ResultsPanel({
  spec,
  expected,
  panel,
  target,
}: {
  spec: LogicSpec;
  expected: TruthTable | null;
  panel: PanelState;
  target: SolverTarget;
}) {
  return (
    <div className="flex h-full flex-col bg-background text-sm">
      <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        <Table2 className="size-3.5" />
        Үр дүн
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {panel.kind === "idle" && (
          <p className="text-muted-foreground">
            «Ажиллуулах» — таны хэлхээний үнэний хүснэгт · «Илгээх» —{" "}
            {target.kind === "challenge" ? "шалгуулж XP авах" : "шалгуулж оноо авах"}
            {target.kind === "contest" && target.disabled && " (тэмцээн явагдаагүй байна)"}
          </p>
        )}
        {panel.kind === "busy" && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Шалгаж байна…
          </p>
        )}
        {panel.kind === "message" && <p className="text-destructive">✗ {panel.message}</p>}
        {panel.kind === "invalid" && (
          <ul className="space-y-1 text-destructive">
            {panel.errors.map((e) => (
              <li key={e.message}>✗ {e.message}</li>
            ))}
          </ul>
        )}
        {panel.kind === "table" && (
          <div className="space-y-3">
            {panel.graded && <GradedSummary graded={panel.graded} tableHidden={!expected} />}
            <TruthTableView spec={spec} table={panel.table} expected={expected} />
          </div>
        )}
      </div>
    </div>
  );
}

function GradedSummary({ graded, tableHidden }: { graded: Graded; tableHidden: boolean }) {
  const all = graded.correctRows === graded.totalRows;
  const { outcome } = graded;
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        all ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"
      )}
    >
      <p className="font-medium">
        {graded.correctRows}/{graded.totalRows} мөр зөв
        {all && (outcome.kind === "challenge" ? " — бодлого биелэгдлээ!" : " — бүх мөр зөв!")}
      </p>
      {!all && tableHidden && (
        <p className="text-muted-foreground">
          Аль мөр буруу болохыг харуулахгүй. Хэлхээгээ дахин шалгаарай.
        </p>
      )}
      {outcome.kind === "challenge" && outcome.xpAwarded > 0 && (
        <p className="mt-1 font-medium text-emerald-700">🏆 +{outcome.xpAwarded} XP</p>
      )}
      {outcome.kind === "challenge" && outcome.unlockedModule && (
        <p className="mt-1 text-violet-700">
          🎉 Модуль дууслаа!{" "}
          <Link href={`/modules/${outcome.unlockedModule.id}`} className="underline underline-offset-4">
            «{outcome.unlockedModule.title}»
          </Link>{" "}
          нээгдлээ
          <ChevronRight className="inline size-3.5" />
        </p>
      )}
      {outcome.kind === "contest" && (
        <p className="mt-1">
          Оноо: <b>{outcome.score}</b> / {outcome.maxPoints}
          {outcome.improved ? " — шинэ дээд амжилт!" : ` (таны шилдэг: ${outcome.bestScore})`}
        </p>
      )}
    </div>
  );
}

function TruthTableView({
  spec,
  table,
  expected,
}: {
  spec: LogicSpec;
  table: TruthTable;
  expected: TruthTable | null;
}) {
  return (
    <table className="font-mono text-xs">
      <thead>
        <tr className="text-muted-foreground">
          {spec.inputs.map((n) => (
            <th key={n} className="px-2 py-1 text-center">{n}</th>
          ))}
          {spec.outputs.map((n, j) => (
            <th key={n} className={cn("px-2 py-1 text-center", j === 0 && "border-l")}>Таны {n}</th>
          ))}
          {expected &&
            spec.outputs.map((n, j) => (
              <th key={`e${n}`} className={cn("px-2 py-1 text-center", j === 0 && "border-l")}>
                Хүлээгдэж буй {n}
              </th>
            ))}
          {expected && <th className="px-2 py-1" />}
        </tr>
      </thead>
      <tbody>
        {table.map((row, i) => {
          const ok = expected ? row === expected[i] : null;
          return (
            <tr key={i} className={cn("border-t", ok === false && "bg-red-500/10")}>
              {rowInputs(spec.inputs.length, i).map((b, j) => (
                <td key={j} className="px-2 py-0.5 text-center">{b}</td>
              ))}
              {row.split("").map((b, j) => (
                <td key={`o${j}`} className={cn("px-2 py-0.5 text-center font-semibold", j === 0 && "border-l")}>
                  {b}
                </td>
              ))}
              {expected &&
                expected[i].split("").map((b, j) => (
                  <td key={`e${j}`} className={cn("px-2 py-0.5 text-center", j === 0 && "border-l")}>
                    {b}
                  </td>
                ))}
              {expected && (
                <td className={cn("px-2 py-0.5", ok ? "text-emerald-600" : "text-red-600")}>
                  {ok ? "✓" : "✗"}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
