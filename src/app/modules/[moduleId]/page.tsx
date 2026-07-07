import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Code2, Lock, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { listChallengesByModule } from "@/lib/firebase/challenges";
import { listPassedChallengeIds } from "@/lib/firebase/submissions";
import { getLesson } from "@/lib/content";
import { MdxContent } from "@/components/mdx/mdx-content";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ModuleLessonPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const lesson = getLesson(moduleId);
  if (!lesson) notFound();

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await getUserProfile(session.user.id).catch(() => null);
  const isUnlocked =
    profile?.role === "teacher" ||
    (profile?.unlocked_modules ?? []).includes(moduleId);

  const [challenges, passedIds] = isUnlocked
    ? await Promise.all([
        listChallengesByModule(moduleId),
        listPassedChallengeIds(session.user.id),
      ])
    : [[], new Set<string>()];

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-muted/40">
        <SiteHeader />
        <main className="mx-auto flex max-w-3xl flex-col items-center gap-4 p-4 pt-24 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Lock className="size-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Энэ модуль түгжээтэй байна</h1>
          <p className="max-w-md text-muted-foreground">
            «{lesson.meta.title}» модулийг нээхийн тулд өмнөх модулийн бүх
            дасгалыг амжилттай бодож дуусгах шаардлагатай.
          </p>
          <Button render={<Link href="/modules" />} nativeButton={false} variant="outline">
            <ArrowLeft className="size-4" />
            Модулиудын жагсаалт руу буцах
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl p-4 pt-8">
        <div className="mb-6 flex items-center justify-between">
          <Button render={<Link href="/modules" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Модулиуд
          </Button>
          <span className="text-sm text-muted-foreground">
            {lesson.meta.syllabus_ref} · Модуль {lesson.meta.order}
          </span>
        </div>

        <article className="prose prose-neutral dark:prose-invert max-w-none rounded-xl border bg-background p-6 sm:p-10 prose-pre:rounded-lg prose-pre:border">
          <MdxContent source={lesson.content} />
        </article>

        {challenges.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-bold">Дасгалууд</h2>
            <div className="space-y-3">
              {challenges.map((ch) => {
                const passed = passedIds.has(ch.id);
                return (
                  <Link key={ch.id} href={`/challenges/${ch.id}`} className="block">
                    <Card className="transition-colors hover:border-primary/50">
                      <CardContent className="flex items-center gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                          {passed ? (
                            <CheckCircle2 className="size-5 text-emerald-600" />
                          ) : (
                            <Code2 className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{ch.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {passed
                              ? "Амжилттай бодсон"
                              : { coding: "Кодын даалгавар", mcq: "Сонгох тест", tracing: "Код мөшгих", theory: "Онолын асуулт" }[ch.type]}
                          </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground">
                          <Trophy className="size-4" />
                          {ch.xp_reward} XP
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
