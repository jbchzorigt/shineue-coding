import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { isStaff } from "@/lib/types";
import { getModule } from "@/lib/firebase/modules";
import { SiteHeader } from "@/components/site-header";
import { ModuleForm } from "@/components/teacher/module-form";
import { Button } from "@/components/ui/button";

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { moduleId } = await params;
  const isNew = moduleId === "new";
  const mod = isNew ? null : await getModule(moduleId);
  if (!isNew && !mod) notFound();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <Button
            render={<Link href="/teacher/content" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="size-4" />
            Контент удирдлага
          </Button>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? "Шинэ модуль" : `Модуль засах: ${mod!.title}`}
          </h1>
        </div>
        <div className="rounded-xl border bg-background p-6">
          <ModuleForm module={mod} />
        </div>
      </main>
    </div>
  );
}
