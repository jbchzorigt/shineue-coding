import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Pencil, Plus } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { isStaff } from "@/lib/types";
import { listModules } from "@/lib/firebase/modules";
import { listChallengesByModule } from "@/lib/firebase/challenges";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABEL = {
  coding: "Код",
  mcq: "Тест",
  tracing: "Мөшгих",
  theory: "Онол",
} as const;

export default async function TeacherContentPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const modules = await listModules();
  const challengesPerModule = await Promise.all(
    modules.map((m) => listChallengesByModule(m.id))
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 p-4 pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Контент удирдлага</h1>
            <p className="text-muted-foreground">
              Модуль болон даалгавруудаа эндээс нэмж, засварлана.
            </p>
          </div>
          <Button render={<Link href="/teacher/content/module/new" />} nativeButton={false}>
            <Plus className="size-4" />
            Шинэ модуль
          </Button>
        </div>

        {modules.map((mod, i) => (
          <Card key={mod.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {mod.syllabus_ref} · Модуль {mod.order} · <code>{mod.id}</code>
                </p>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  {mod.title}
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  render={<Link href={`/teacher/content/module/${mod.id}`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <Pencil className="size-3.5" />
                  Засах
                </Button>
                <Button
                  render={
                    <Link href={`/teacher/content/challenge/new?module=${mod.id}`} />
                  }
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="size-3.5" />
                  Даалгавар
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {challengesPerModule[i].length === 0 ? (
                <p className="text-sm text-destructive">
                  ⚠ Даалгаваргүй — сурагчид энэ модулийг дуусгаж чадахгүй!
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {challengesPerModule[i].map((ch) => (
                    <li key={ch.id} className="flex items-center justify-between py-2">
                      <span>
                        <span className="mr-2 inline-block w-14 rounded bg-muted px-1.5 py-0.5 text-center text-xs font-medium">
                          {TYPE_LABEL[ch.type]}
                        </span>
                        {ch.title}
                        <span className="ml-2 text-muted-foreground">· {ch.xp_reward} XP</span>
                      </span>
                      <Button
                        render={<Link href={`/teacher/content/challenge/${ch.id}`} />}
                        nativeButton={false}
                        variant="ghost"
                        size="sm"
                      >
                        <Pencil className="size-3.5" />
                        Засах
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
