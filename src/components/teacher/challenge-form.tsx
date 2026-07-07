"use client";

import { useActionState, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { saveChallenge, deleteChallenge, type ActionState } from "@/lib/teacher-actions";
import { TestCaseEditor } from "@/components/teacher/test-case-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Challenge, ChallengePrivate, ChallengeType } from "@/lib/types";

const TYPES: { value: ChallengeType; label: string }[] = [
  { value: "coding", label: "Кодын даалгавар (Piston)" },
  { value: "mcq", label: "Сонгох тест (MCQ)" },
  { value: "tracing", label: "Код мөшгих (гаралт таах)" },
  { value: "theory", label: "Онолын асуулт (mark scheme)" },
];

export function ChallengeForm({
  challenge,
  privateData,
  defaultModuleId,
  moduleIds,
}: {
  challenge: Challenge | null;
  privateData: ChallengePrivate | null;
  defaultModuleId: string;
  moduleIds: string[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveChallenge,
    { error: null }
  );
  const [type, setType] = useState<ChallengeType>(challenge?.type ?? "coding");

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="id">Даалгаврын ID</Label>
          <Input
            id="id"
            name="id"
            defaultValue={challenge?.id ?? ""}
            placeholder="ch-04-loops"
            readOnly={!!challenge}
            className={challenge ? "bg-muted" : ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="module_id">Модуль</Label>
          <select
            id="module_id"
            name="module_id"
            defaultValue={challenge?.module_id ?? defaultModuleId}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs"
          >
            {moduleIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Төрөл</Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ChallengeType)}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="xp_reward">XP</Label>
            <Input id="xp_reward" name="xp_reward" type="number" min={1} max={500} defaultValue={challenge?.xp_reward ?? 10} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order">Дараалал</Label>
            <Input id="order" name="order" type="number" min={1} defaultValue={challenge?.order ?? 1} required />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Гарчиг</Label>
        <Input id="title" name="title" defaultValue={challenge?.title ?? ""} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prompt">Даалгаврын өгүүлбэр (Markdown)</Label>
        <Textarea
          id="prompt"
          name="prompt"
          defaultValue={challenge?.prompt ?? ""}
          className="min-h-32 font-mono text-sm"
          required
        />
      </div>

      {type === "coding" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="starter_code">Эхлэлийн код (Python)</Label>
            <Textarea
              id="starter_code"
              name="starter_code"
              defaultValue={challenge?.starter_code ?? ""}
              className="min-h-24 font-mono text-sm"
              placeholder={"n = int(input())\n# эндээс үргэлжлүүлээрэй"}
            />
          </div>
          <TestCaseEditor
            name="public_tests"
            label="Нээлттэй тестүүд"
            help="Сурагчид оролт/гаралтыг нь хардаг."
            initial={challenge?.public_test_cases ?? [{ input: "", expected_output: "" }]}
          />
          <TestCaseEditor
            name="hidden_tests"
            label="Нууц тестүүд"
            help="Сурагчдад зөвхөн ✓/✗ харагдана."
            hidden
            initial={privateData?.hidden_test_cases ?? []}
          />
        </>
      )}

      {type === "mcq" && (
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div className="space-y-1.5">
            <Label htmlFor="options">Сонголтууд (мөр бүрт нэг)</Label>
            <Textarea
              id="options"
              name="options"
              defaultValue={(challenge?.options ?? []).join("\n")}
              className="min-h-28"
              placeholder={"Эхний сонголт\nХоёр дахь сонголт\nГурав дахь сонголт"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="correct_index">Зөв хариултын №</Label>
            <Input
              id="correct_index"
              name="correct_index"
              type="number"
              min={1}
              defaultValue={
                typeof privateData?.correct_answer_index === "number"
                  ? privateData.correct_answer_index + 1
                  : ""
              }
            />
            <p className="text-xs text-muted-foreground">1-ээс эхэлж тоолно</p>
          </div>
        </div>
      )}

      {type === "tracing" && (
        <div className="space-y-1.5">
          <Label htmlFor="expected_answer">Хүлээгдэх хариулт (яг хэвлэгдэх гаралт)</Label>
          <Textarea
            id="expected_answer"
            name="expected_answer"
            defaultValue={privateData?.expected_answer ?? ""}
            className="min-h-20 font-mono text-sm"
          />
        </div>
      )}

      {type === "theory" && (
        <div className="space-y-1.5">
          <Label htmlFor="mark_scheme">Үнэлгээний схем (хариулт илгээсний дараа харагдана)</Label>
          <Textarea
            id="mark_scheme"
            name="mark_scheme"
            defaultValue={privateData?.mark_scheme ?? ""}
            className="min-h-28"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="hint">Hint (заавал биш — ашиглавал XP-ийн 30% суутгагдана)</Label>
        <Textarea
          id="hint"
          name="hint"
          defaultValue={privateData?.hint ?? ""}
          className="min-h-16"
        />
      </div>

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
        {challenge && (
          <Button
            type="submit"
            formAction={deleteChallenge}
            formNoValidate
            variant="destructive"
            onClick={(e) => {
              if (!confirm(`«${challenge.title}» даалгаврыг устгах уу?`)) e.preventDefault();
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
