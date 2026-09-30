"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ uid, name }: { uid: string; name: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState>(
    () => resetPasswordAction(uid),
    { tempPassword: null, error: null }
  );

  return (
    <form
      action={action}
      className="inline-flex items-center gap-2"
      onSubmit={(e) => {
        if (!confirm(`«${name}»-ийн нууц үгийг шинэчлэх үү? Нээлттэй session нь гарна.`)) {
          e.preventDefault();
        }
      }}
    >
      {state.tempPassword && (
        <code
          className="rounded bg-amber-500/15 px-2 py-1 font-mono text-sm text-amber-900"
          title="Зөвхөн одоо харагдана — сурагчид өгнө үү"
        >
          {state.tempPassword}
        </code>
      )}
      {state.error && <span className="text-sm text-destructive">{state.error}</span>}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <KeyRound className="size-4" />
        Нууц үг шинэчлэх
      </Button>
    </form>
  );
}
