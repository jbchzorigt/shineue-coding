"use client";

import { useActionState } from "react";
import { Copy, Loader2 } from "lucide-react";
import { copyContestProblem } from "@/lib/contest-actions";
import type { ActionState } from "@/lib/teacher-actions";
import { Button } from "@/components/ui/button";

/** Copies this problem (with its hidden tests) into another contest. */
export function CopyProblemForm({
  contestId,
  problemId,
  targets,
}: {
  contestId: string;
  problemId: string;
  targets: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    copyContestProblem.bind(null, contestId, problemId),
    { error: null }
  );
  if (targets.length === 0) return null;
  return (
    <form action={action} className="space-y-2">
      <p className="font-medium">Өөр тэмцээн рүү хуулах</p>
      <div className="flex flex-wrap items-center gap-2">
        <select name="to" required className="h-9 rounded-md border bg-background px-2 text-sm">
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
          Хуулах
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Хуулбар бие даасан — нэгийг засахад нөгөө өөрчлөгдөхгүй</p>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
