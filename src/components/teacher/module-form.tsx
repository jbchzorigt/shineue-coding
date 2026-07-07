"use client";

import { useActionState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { saveModule, deleteModule, type ActionState } from "@/lib/teacher-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ModuleDoc } from "@/lib/firebase/modules";

export function ModuleForm({ module: mod }: { module: ModuleDoc | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveModule,
    { error: null }
  );

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="id">Модулийн ID</Label>
          <Input
            id="id"
            name="id"
            defaultValue={mod?.id ?? ""}
            placeholder="module-04"
            readOnly={!!mod}
            className={mod ? "bg-muted" : ""}
            required
          />
          {!mod && (
            <p className="text-xs text-muted-foreground">
              Латин жижиг үсэг, тоо, зураас. Хожим өөрчлөх боломжгүй.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="syllabus_ref">Хөтөлбөрийн лавлагаа</Label>
          <Input
            id="syllabus_ref"
            name="syllabus_ref"
            defaultValue={mod?.syllabus_ref ?? ""}
            placeholder="A2.1"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <Label htmlFor="title">Гарчиг</Label>
          <Input id="title" name="title" defaultValue={mod?.title ?? ""} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order">Дараалал</Label>
          <Input
            id="order"
            name="order"
            type="number"
            min={1}
            defaultValue={mod?.order ?? ""}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Товч тайлбар</Label>
        <Input
          id="description"
          name="description"
          defaultValue={mod?.description ?? ""}
          placeholder="Модулиудын жагсаалтад харагдана"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lesson_mdx">Хичээлийн агуулга (MDX/Markdown)</Label>
        <Textarea
          id="lesson_mdx"
          name="lesson_mdx"
          defaultValue={mod?.lesson_mdx ?? ""}
          className="min-h-96 font-mono text-sm"
          placeholder={"# Гарчиг\n\nЭнгийн markdown бичнэ: **тод**, `код`, хүснэгт, ```python код блок```.\n\n<Callout type=\"info\">Санамж хайрцаг</Callout>"}
          required
        />
        <p className="text-xs text-muted-foreground">
          Markdown + хүснэгт, кодын блок (```python), мөн {"<Callout type=\"info|warning\">"} хайрцаг дэмжинэ.
        </p>
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
        {mod && (
          <Button
            type="submit"
            formAction={deleteModule}
            formNoValidate
            variant="destructive"
            onClick={(e) => {
              if (!confirm(`«${mod.title}» модулийг устгах уу? Даалгаврууд нь үлдэнэ.`)) {
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
