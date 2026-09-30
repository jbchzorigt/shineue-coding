import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { CreateUsersForm } from "@/components/teacher/create-users-form";
import { Button } from "@/components/ui/button";

export default async function NewUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");
  const isAdmin = profile?.role === "admin";

  // Printed on each slip, so students know where to sign in.
  const h = await headers();
  const siteUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3001"}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8 print:p-0">
        <div className="space-y-1 print:hidden">
          <Button render={<Link href="/teacher" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Багшийн самбар
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UserPlus className="size-6" />
            Хэрэглэгч нэмэх
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Сурагч эсвэл багш нэмнэ." : "Сурагч нэмнэ."} Хүн бүрт түр нууц үг үүснэ.
          </p>
        </div>
        <CreateUsersForm isAdmin={isAdmin} siteUrl={siteUrl} />
      </main>
    </div>
  );
}
