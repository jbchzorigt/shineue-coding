"use client";

import { useActionState, useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { saveContest, deleteContest } from "@/lib/contest-actions";
import type { ActionState } from "@/lib/teacher-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contest } from "@/lib/db/contests";

/** datetime-local value (local time) for a given epoch ms. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DateTimeField({
  name,
  label,
  initialMs,
}: {
  name: string;
  label: string;
  initialMs: number | null;
}) {
  const [ms, setMs] = useState<number | "">(initialMs ?? "");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {/* The browser input is local time; the epoch travels to the server. */}
      <input type="hidden" name={name} value={ms} />
      <Input
        id={name}
        type="datetime-local"
        defaultValue={initialMs ? toLocalInput(initialMs) : ""}
        onChange={(e) => {
          const v = e.target.value;
          setMs(v ? new Date(v).getTime() : "");
        }}
        required
      />
    </div>
  );
}

export function ContestForm({ contest }: { contest: Contest | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveContest,
    { error: null }
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="id">Тэмцээний ID</Label>
          <Input
            id="id"
            name="id"
            defaultValue={contest?.id ?? ""}
            placeholder="contest-2026-09"
            readOnly={!!contest}
            className={contest ? "bg-muted" : ""}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Гарчиг</Label>
          <Input id="title" name="title" defaultValue={contest?.title ?? ""} required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Тайлбар</Label>
        <Input
          id="description"
          name="description"
          defaultValue={contest?.description ?? ""}
          placeholder="Намрын улирлын программчлалын тэмцээн"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField name="starts_at_ms" label="Эхлэх цаг" initialMs={contest?.starts_at ?? null} />
        <DateTimeField name="ends_at_ms" label="Дуусах цаг" initialMs={contest?.ends_at ?? null} />
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
        {contest && (
          <Button
            type="submit"
            formAction={deleteContest}
            formNoValidate
            variant="destructive"
            onClick={(e) => {
              if (!confirm(`«${contest.title}» тэмцээнийг бүх бодлого, оролцогчидтой нь устгах уу?`)) {
                e.preventDefault();
              }
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
