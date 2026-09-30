"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  Send,
  TerminalSquare,
} from "lucide-react";
import { HintBox } from "@/components/challenge/hint-box";
import { Button } from "@/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { TestResultDto } from "@/app/api/challenges/[challengeId]/submit/route";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-sm text-white/60">
      Editor ачаалж байна…
    </div>
  ),
});

interface SubmitResponse {
  passed: boolean;
  results: TestResultDto[];
  xpAwarded: number;
  unlockedModule: { id: string; title: string } | null;
  runOnly?: boolean;
  message?: string;
}

type TerminalState =
  | { kind: "idle" }
  | { kind: "running"; mode: "run" | "submit" }
  | { kind: "error"; message: string }
  | { kind: "result"; mode: "run" | "submit"; response: SubmitResponse };

export function ChallengeWorkspace({
  challengeId,
  initialCode,
  alreadyPassed,
  hasHint,
  hintAlreadyUsed,
  description,
}: {
  challengeId: string;
  initialCode: string;
  alreadyPassed: boolean;
  hasHint: boolean;
  hintAlreadyUsed: boolean;
  /** Server-rendered MDX prompt. */
  description: ReactNode;
}) {
  const [code, setCode] = useState(initialCode);
  const [terminal, setTerminal] = useState<TerminalState>({ kind: "idle" });

  const busy = terminal.kind === "running";

  async function execute(mode: "run" | "submit") {
    setTerminal({ kind: "running", mode });
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, mode }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (!res.ok) {
        setTerminal({ kind: "error", message: data.message ?? "Алдаа гарлаа. Дахин оролдоно уу." });
      } else {
        setTerminal({ kind: "result", mode, response: data });
      }
    } catch {
      setTerminal({ kind: "error", message: "Сервертэй холбогдож чадсангүй." });
    }
  }

  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 flex-1 max-lg:flex-col!"
    >
      {/* Left: problem description */}
      <ResizablePanel defaultSize="42%" minSize="25%" className="max-lg:basis-auto!">
        <div className="h-full overflow-y-auto bg-background p-6">
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
            {description}
          </div>

          {hasHint && (
            <HintBox
              challengeId={challengeId}
              alreadyPassed={alreadyPassed}
              hintAlreadyUsed={hintAlreadyUsed}
              onError={(message) => setTerminal({ kind: "error", message })}
            />
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="max-lg:hidden" />

      {/* Right: editor over terminal */}
      <ResizablePanel defaultSize="58%" minSize="30%" className="max-lg:basis-auto!">
        <ResizablePanelGroup orientation="vertical" className="max-lg:flex-col!">
          <ResizablePanel defaultSize="60%" minSize="25%" className="max-lg:basis-auto! max-lg:min-h-72">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1.5">
                <span className="font-mono text-xs text-muted-foreground">main.py</span>
                <div className="flex items-center gap-2">
                  {alreadyPassed && (
                    <span className="mr-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      Бодсон
                    </span>
                  )}
                  <Button
                    onClick={() => execute("run")}
                    disabled={busy}
                    variant="outline"
                    size="sm"
                  >
                    {busy && terminal.mode === "run" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    Ажиллуулах
                  </Button>
                  <Button onClick={() => execute("submit")} disabled={busy} size="sm">
                    {busy && terminal.mode === "submit" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )}
                    Илгээх
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <MonacoEditor
                  height="100%"
                  language="python"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    tabSize: 4,
                    automaticLayout: true,
                    padding: { top: 12 },
                  }}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="max-lg:hidden" />

          <ResizablePanel defaultSize="40%" minSize="15%" className="max-lg:basis-auto! max-lg:min-h-56">
            <Terminal state={terminal} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

/* ------------------------------------------------------------------ */

function Terminal({ state }: { state: TerminalState }) {
  return (
    <div className="flex h-full flex-col bg-zinc-950 font-mono text-[13px] leading-relaxed text-zinc-200">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-1.5 text-xs text-zinc-400">
        <TerminalSquare className="size-3.5" />
        Тестийн үр дүн
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {state.kind === "idle" && (
          <p className="text-zinc-500">
            «Ажиллуулах» — нээлттэй тестүүд · «Илгээх» — нууц тестүүд + XP
          </p>
        )}

        {state.kind === "running" && (
          <p className="text-zinc-400">
            <span className="text-emerald-400">$</span> python main.py
            <span className="animate-pulse"> ▍</span>
          </p>
        )}

        {state.kind === "error" && <p className="text-red-400">✗ {state.message}</p>}

        {state.kind === "result" && <TerminalResults state={state} />}
      </div>
    </div>
  );
}

function TerminalResults({
  state,
}: {
  state: Extract<TerminalState, { kind: "result" }>;
}) {
  const { response, mode } = state;
  return (
    <div className="space-y-3">
      <p className="text-zinc-500">
        <span className="text-emerald-400">$</span> python main.py
      </p>

      {response.results.map((r, i) => (
        <div key={i}>
          {r.hidden ? (
            <p className={r.passed ? "text-emerald-400" : "text-red-400"}>
              {r.passed ? "✓" : "✗"} Нууц тест {i + 1}:{" "}
              {r.passed ? "амжилттай" : "амжилтгүй"}
              <span className="ml-2 text-zinc-500">🔒</span>
            </p>
          ) : (
            <div>
              <p className={r.passed ? "text-emerald-400" : "text-red-400"}>
                {r.passed ? "✓" : "✗"} Тест {i + 1}:{" "}
                {r.passed ? "амжилттай" : "амжилтгүй"}
              </p>
              {!r.passed && (
                <div className="mt-1 ml-5 space-y-0.5 text-zinc-300">
                  <p>
                    <span className="inline-block w-32 text-zinc-500">Оролт:</span>
                    <span className="whitespace-pre-wrap">{r.input}</span>
                  </p>
                  <p>
                    <span className="inline-block w-32 text-zinc-500">Хүлээгдэж буй:</span>
                    <span className="text-emerald-300">{r.expected}</span>
                  </p>
                  <p>
                    <span className="inline-block w-32 text-zinc-500">
                      {r.error ? "Алдаа:" : "Таны гаралт:"}
                    </span>
                    <span className={cn("whitespace-pre-wrap", r.error ? "text-red-300" : "text-amber-300")}>
                      {r.actual}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-zinc-800 pt-2">
        {response.passed ? (
          <p className="text-emerald-400">
            ✓ {mode === "run" ? "Нээлттэй тестүүд амжилттай — одоо «Илгээх» дарж бүрэн шалгуулаарай." : "Бүх тест амжилттай!"}
            {response.xpAwarded > 0 && (
              <span className="ml-2 rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                🏆 +{response.xpAwarded} XP
              </span>
            )}
          </p>
        ) : (
          <p className="text-red-400">
            ✗ {response.results.filter((r) => !r.passed).length} тест амжилтгүй байна.
          </p>
        )}
        {response.unlockedModule && (
          <p className="mt-1 text-violet-300">
            🎉 Модуль дууслаа!{" "}
            <Link
              href={`/modules/${response.unlockedModule.id}`}
              className="underline underline-offset-4"
            >
              «{response.unlockedModule.title}»
            </Link>{" "}
            нээгдлээ
            <ChevronRight className="inline size-3.5" />
          </p>
        )}
      </div>
    </div>
  );
}
