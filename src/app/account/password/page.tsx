import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const forced = session.user.mustChangePassword;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Нууц үг солих
          </CardTitle>
          <CardDescription>
            {forced
              ? "Түр нууц үгээр нэвтэрсэн байна. Үргэлжлүүлэхийн өмнө өөрийн нууц үгийг тохируулна уу."
              : session.user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChangePasswordForm />
          <div className="flex gap-2">
            {!forced && (
              <Button render={<Link href="/" />} nativeButton={false} variant="ghost" className="flex-1">
                Буцах
              </Button>
            )}
            <form action={signOutAction} className="flex-1">
              <Button type="submit" variant="ghost" className="w-full">
                Гарах
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
