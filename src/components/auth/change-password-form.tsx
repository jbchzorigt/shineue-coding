"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {
    error: null,
  });

  return (
    <form action={action} className="space-y-3">
      <Field id="current" label="Одоогийн (эсвэл түр) нууц үг" autoComplete="current-password" />
      <Field id="next" label="Шинэ нууц үг (8+ тэмдэгт)" autoComplete="new-password" minLength={8} />
      <Field id="confirm" label="Шинэ нууц үгээ давтах" autoComplete="new-password" minLength={8} />
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Хадгалж байна…" : "Нууц үг солих"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        required
      />
    </div>
  );
}
