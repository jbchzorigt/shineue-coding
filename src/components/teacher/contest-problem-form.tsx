"use client";

import { useActionState, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { saveContestProblem, deleteContestProblem } from "@/lib/contest-actions";
import type { ActionState } from "@/lib/teacher-actions";
import { LogicSpecFields } from "@/components/teacher/logic-spec-fields";
import { TestCaseEditor } from "@/components/teacher/test-case-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContestProblem, ContestProblemKind, ContestProblemPrivate } from "@/lib/db/contests";

export function ContestProblemForm({
  contestId,
  problem,
  privateData,
}: {
  contestId: string;
  problem: ContestProblem | null;
  privateData: ContestProblemPrivate | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveContestProblem,
    { error: null }
  );
  const [kind, setKind] = useState<ContestProblemKind>(problem?.kind ?? "python");

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="contest_id" value={contestId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="id">Бодлогын ID</Label>
          <Input
            id="id"
            name="id"
            defaultValue={problem?.id ?? ""}
            placeholder="problem-1"
            readOnly={!!problem}
            className={problem ? "bg-muted" : ""}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="points">Оноо</Label>
            <Input id="points" name="points" type="number" min={1} max={1000} defaultValue={problem?.points ?? 100} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order">Дараалал</Label>
            <Input id="order" name="order" type="number" min={1} defaultValue={problem?.order ?? 1} required />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="kind">Төрөл</Label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ContestProblemKind)}
          className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs"
        >
          <option value="python">Python код</option>
          <option value="logic">Логик хэлхээ (Gate)</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Гарчиг</Label>
        <Input id="title" name="title" defaultValue={problem?.title ?? ""} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prompt">Бодлогын өгүүлбэр (Markdown)</Label>
        <Textarea
          id="prompt"
          name="prompt"
          defaultValue={problem?.prompt ?? ""}
          className="min-h-32 font-mono text-sm"
          required
        />
      </div>

      {kind === "logic" ? (
        <LogicSpecFields initialSpec={problem?.logic_spec} initialTable={privateData?.expected_table} />
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="starter_code">Эхлэлийн код (Python)</Label>
            <Textarea
              id="starter_code"
              name="starter_code"
              defaultValue={problem?.starter_code ?? ""}
              className="min-h-24 font-mono text-sm"
            />
          </div>

          <TestCaseEditor
            name="public_tests"
            label="Нээлттэй тестүүд"
            help="Оролцогчид оролт/гаралтыг нь хардаг. Оноо тест бүрээс хувь тэнцүүлэн бодогдоно."
            initial={problem?.public_test_cases ?? [{ input: "", expected_output: "" }]}
          />
          <TestCaseEditor
            name="hidden_tests"
            label="Нууц тестүүд"
            help="Оролцогчдод зөвхөн ✓/✗ харагдана."
            hidden
            initial={privateData?.hidden_test_cases ?? []}
          />
        </>
      )}

      {state.error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Хадгалах
        </Button>
        {problem && (
          <Button
            type="submit"
            formAction={deleteContestProblem}
            formNoValidate
            variant="destructive"
            onClick={(e) => {
              if (!confirm(`«${problem.title}» бодлогыг устгах уу?`)) e.preventDefault();
            }}
          >
            <Trash2 className="size-4" />
            Устгах
          </Button>
        )}
      </div>
    </form>
  );
}
