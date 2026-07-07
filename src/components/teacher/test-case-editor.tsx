"use client";

import { useState } from "react";
import { EyeOff, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PublicTestCase } from "@/lib/types";

export function TestCaseEditor({
  name,
  label,
  help,
  hidden = false,
  initial,
}: {
  name: string;
  label: string;
  help: string;
  hidden?: boolean;
  initial: PublicTestCase[];
}) {
  const [tests, setTests] = useState<PublicTestCase[]>(initial);

  function update(i: number, key: keyof PublicTestCase, value: string) {
    setTests((prev) => prev.map((t, j) => (j === i ? { ...t, [key]: value } : t)));
  }

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <input type="hidden" name={name} value={JSON.stringify(tests)} />
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {hidden && <EyeOff className="size-3.5" />}
          {label}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setTests((p) => [...p, { input: "", expected_output: "" }])}
        >
          <Plus className="size-3.5" />
          Тест нэмэх
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{help}</p>
      {tests.map((t, i) => (
        <div key={i} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_1fr_2rem]">
          <Textarea
            value={t.input}
            onChange={(e) => update(i, "input", e.target.value)}
            placeholder="Оролт (stdin)"
            className="min-h-16 font-mono text-xs"
          />
          <Textarea
            value={t.expected_output}
            onChange={(e) => update(i, "expected_output", e.target.value)}
            placeholder="Хүлээгдэх гаралт"
            className="min-h-16 font-mono text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => setTests((p) => p.filter((_, j) => j !== i))}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
