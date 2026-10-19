import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Pencil, Plus, Swords, Users } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import {
  contestStatus,
  countPending,
  listContests,
  listParticipants,
  listProblems,
} from "@/lib/db/contests";
import { SiteHeader } from "@/components/site-header";
import { ContestStatusBadge, formatWindow } from "@/components/contest/contest-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function TeacherContestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const contests = await listContests();
  const pending = await countPending(contests.map((c) => c.id));
  const extras = await Promise.all(
    contests.map(async (c) => ({
      problems: (await listProblems(c.id)).length,
      participants: (await listParticipants(c.id)).length,
    }))
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Swords className="size-6" />
              Тэмцээн удирдлага
            </h1>
            <p className="text-muted-foreground">Тэмцээн зохион байгуулж, бодлого оруулна.</p>
          </div>
          <Button render={<Link href="/teacher/contests/new" />} nativeButton={false}>
            <Plus className="size-4" />
            Шинэ тэмцээн
          </Button>
        </div>

        {contests.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Тэмцээн үүсгээгүй байна — &ldquo;Шинэ тэмцээн&rdquo; дарж эхлээрэй.
            </CardContent>
          </Card>
        )}

        {contests.map((c, i) => (
          <Card key={c.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{c.title}</h2>
                  <ContestStatusBadge status={contestStatus(c)} />
                  {(pending.get(c.id) ?? 0) > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {pending.get(c.id)} хүсэлт хүлээгдэж байна
                    </span>
                  )}
                </div>
                <p className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3.5" />
                    {formatWindow(c.starts_at, c.ends_at)}
                  </span>
                  <span>{extras[i].problems} бодлого</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {extras[i].participants}
                  </span>
                </p>
              </div>
              <Button
                render={<Link href={`/teacher/contests/${c.id}`} />}
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                <Pencil className="size-3.5" />
                Удирдах
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
