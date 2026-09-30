"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction, type FormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {
    error: null,
  });

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Сургуулийн имэйл</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="нэр@shineue.edu.mn"
          defaultValue={state.email ?? ""}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Нууц үг</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        <LogIn className="size-4" />
        {pending ? "Шалгаж байна…" : "Нэвтрэх"}
      </Button>
    </form>
  );
}
