"use client";

import { Trash2 } from "lucide-react";
import { deleteUser } from "@/lib/teacher-actions";
import { Button } from "@/components/ui/button";

export function DeleteUserButton({
  uid,
  name,
}: {
  uid: string;
  name: string | null;
}) {
  return (
    <form action={deleteUser.bind(null, uid)} className="inline">
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        aria-label="Хэрэглэгч устгах"
        onClick={(e) => {
          if (
            !confirm(
              `«${name ?? uid}» хэрэглэгчийг бүх өгөгдөлтэй нь (явц, оноо, сертификат) устгах уу?\n\nЭнэ үйлдлийг буцаах боломжгүй.`
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}
