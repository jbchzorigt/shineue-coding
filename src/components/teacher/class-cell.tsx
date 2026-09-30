"use client";

import { useState, useTransition } from "react";
import { setClassAction } from "@/lib/account-actions";
import { cn } from "@/lib/utils";

/** Inline class editor for the /teacher table: saves on Enter or when leaving the field. */
export function ClassCell({ uid, name, value }: { uid: string; name: string; value: string | null }) {
  const [saved, setSaved] = useState(value ?? "");
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (draft === saved) return;
    startTransition(async () => {
      const result = await setClassAction(uid, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(result.value ?? "");
      setDraft(result.value ?? "");
    });
  }

  return (
    <div className="w-20">
      <input
        aria-label={`${name}: анги`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(saved);
            setError(null);
          }
        }}
        placeholder="—"
        maxLength={20}
        disabled={pending}
        className={cn(
          "h-8 w-full rounded-md border bg-background px-2 text-sm uppercase",
          error ? "border-destructive" : "border-input"
        )}
      />
      {error && <p className="mt-1 w-40 text-[11px] leading-tight text-destructive">{error}</p>}
    </div>
  );
}
