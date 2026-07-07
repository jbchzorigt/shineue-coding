import Link from "next/link";
import { Lock, BookOpen, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { listLessons } from "@/lib/content";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function ModulesPage() {
  const session = await auth();
  const profile = session?.user?.id
    ? await getUserProfile(session.user.id).catch(() => null)
    : null;

  const lessons = listLessons();
  const isTeacher = profile?.role === "teacher";
  const unlocked = new Set(profile?.unlocked_modules ?? []);

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <h1 className="text-2xl font-bold">Модулиуд</h1>
          <p className="text-muted-foreground">
            Модуль бүрийг дуусгаж дараагийнхаа түгжээг тайлаарай.
          </p>
        </div>

        <div className="space-y-3">
          {lessons.map((lesson) => {
            const isUnlocked = isTeacher || unlocked.has(lesson.module_id);
            const inner = (
              <Card
                className={cn(
                  "transition-colors",
                  isUnlocked ? "hover:border-primary/50" : "opacity-60"
                )}
              >
                <CardContent className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      isUnlocked
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isUnlocked ? <BookOpen className="size-5" /> : <Lock className="size-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {lesson.syllabus_ref} · Модуль {lesson.order}
                    </p>
                    <h2 className="truncate font-semibold">{lesson.title}</h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {isUnlocked
                        ? lesson.description
                        : "Түгжээтэй — өмнөх модулиа дуусгана уу"}
                    </p>
                  </div>
                  {isUnlocked && (
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            );

            return isUnlocked ? (
              <Link key={lesson.module_id} href={`/modules/${lesson.module_id}`} className="block">
                {inner}
              </Link>
            ) : (
              <div key={lesson.module_id}>{inner}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
