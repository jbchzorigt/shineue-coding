"use client";

import { useState, type ReactNode } from "react";
import type { Circuit } from "@/lib/logic/circuit";
import type { LogicSpec, TruthTable } from "@/lib/logic/spec";
import { HintBox } from "@/components/challenge/hint-box";
import { LogicConstraints } from "@/components/logic/logic-constraints";
import { LogicSolver } from "@/components/logic/logic-solver";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { NextChallengeButton } from "@/components/challenge/challenge-nav";
import type { NavItem } from "@/lib/challenge-nav";

/** Module challenge layout: prompt and hint on the left, the circuit on the right. */
export function LogicWorkspace({
  challengeId,
  spec,
  expected,
  initialCircuit,
  alreadyPassed,
  hasHint,
  hintAlreadyUsed,
  next,
  moduleId,
  description,
}: {
  challengeId: string;
  spec: LogicSpec;
  expected: TruthTable | null;
  initialCircuit: Circuit | null;
  alreadyPassed: boolean;
  hasHint: boolean;
  hintAlreadyUsed: boolean;
  /** The module's next challenge, or null after the last one. */
  next: NavItem | null;
  moduleId: string;
  /** Server-rendered MDX prompt. */
  description: ReactNode;
}) {
  const [hintError, setHintError] = useState<string | null>(null);
  const [solved, setSolved] = useState(alreadyPassed);

  // Phones: stack the prompt over the circuit in a tall block and let the
  // page scroll (the group's inline height/direction need the ! overrides).
  return (
    <ResizablePanelGroup
      orientation="horizontal"
      className="min-h-0 flex-1 max-lg:h-[60rem]! max-lg:flex-none max-lg:flex-col!"
    >
      <ResizablePanel defaultSize="36%" minSize="22%">
        <div className="h-full overflow-y-auto bg-background p-6">
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">{description}</div>
          <LogicConstraints spec={spec} />
          {hasHint && (
            <HintBox
              challengeId={challengeId}
              alreadyPassed={alreadyPassed}
              hintAlreadyUsed={hintAlreadyUsed}
              onError={setHintError}
            />
          )}
          {hintError && <p className="mt-2 text-sm text-destructive">{hintError}</p>}
          {solved && (
            <div className="mt-6">
              <NextChallengeButton next={next} moduleId={moduleId} />
            </div>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="max-lg:hidden" />

      <ResizablePanel defaultSize="64%" minSize="35%">
        <LogicSolver
          spec={spec}
          expected={expected}
          initialCircuit={initialCircuit}
          target={{ kind: "challenge", challengeId, alreadyPassed }}
          onSolved={() => setSolved(true)}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
