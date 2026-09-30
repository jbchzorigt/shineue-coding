"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { saveModule, deleteModule, type ActionState } from "@/lib/teacher-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ModuleDoc } from "@/lib/db/modules";

export function ModuleForm({ module: mod }: { module: ModuleDoc | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveModule,
    { error: null }
  );
  // Controlled: React resets uncontrolled fields after every action, which
  // would throw away a long lesson whenever the server returns an error.
  const [fields, setFields] = useState({
    id: mod?.id ?? "",
    syllabus_ref: mod?.syllabus_ref ?? "",
    title: mod?.title ?? "",
    order: mod ? String(mod.order) : "",
    description: mod?.description ?? "",
    lesson_mdx: mod?.lesson_mdx ?? "",
  });
  const bind = (name: keyof typeof fields) => ({
    name,
    value: fields[name],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields((f) => ({ ...f, [name]: e.target.value })),
  });

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="id">Модулийн ID</Label>
          <Input
            id="id"
            {...bind("id")}
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
            {...bind("syllabus_ref")}
            placeholder="A2.1"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <div className="space-y-1.5">
          <Label htmlFor="title">Гарчиг</Label>
          <Input id="title" {...bind("title")} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="order">Дараалал</Label>
          <Input
            id="order"
            {...bind("order")}
            type="number"
            min={1}
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Товч тайлбар</Label>
        <Input
          id="description"
          {...bind("description")}
          placeholder="Модулиудын жагсаалтад харагдана"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lesson_mdx">Хичээлийн агуулга (MDX/Markdown)</Label>
        <Textarea
          id="lesson_mdx"
          {...bind("lesson_mdx")}
          className="min-h-96 font-mono text-sm"
          placeholder={"# Гарчиг\n\nЭнгийн markdown бичнэ: **тод**, `код`, хүснэгт, ```python код блок```.\n\n<Callout type=\"info\">Санамж хайрцаг</Callout>"}
          required
        />
        <p className="text-xs text-muted-foreground">
          Markdown + хүснэгт, кодын блок (```python), мөн {"<Callout type=\"info|warning\">"} хайрцаг дэмжинэ.
          HTML таг хаагдсан байх ёстой: {"<img src=\"…\" />"}, {"<br />"}.
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
              if (
                !confirm(
                  `«${mod.title}» модулийг устгах уу? Түүний бүх даалгавар болон сурагчдын бодолтууд хамт устана (авсан XP хэвээр үлдэнэ). Буцаах боломжгүй.`
                )
              ) {
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
