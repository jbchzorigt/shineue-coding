import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ListChecks, Pencil, Plus, Star, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import { getContest, listProblems } from "@/lib/db/contests";
import { SiteHeader } from "@/components/site-header";
import { ContestForm } from "@/components/teacher/contest-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditContestPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { contestId } = await params;
  const isNew = contestId === "new";
  const contest = isNew ? null : await getContest(contestId);
  if (!isNew && !contest) notFound();
  const problems = isNew ? [] : await listProblems(contestId);

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <Button render={<Link href="/teacher/contests" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Тэмцээн удирдлага
          </Button>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? "Шинэ тэмцээн" : contest!.title}
          </h1>
        </div>

        <div className="rounded-xl border bg-background p-6">
          <ContestForm contest={contest} />
        </div>

        {!isNew && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Бодлогууд</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button
                  render={<Link href={`/teacher/contests/${contestId}/submissions`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <ListChecks className="size-3.5" />
                  Илгээлтүүд
                </Button>
                <Button
                  render={<Link href={`/contests/${contestId}/leaderboard`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <Trophy className="size-3.5" />
                  Leaderboard
                </Button>
                <Button
                  render={<Link href={`/teacher/contests/${contestId}/problems/new`} />}
                  nativeButton={false}
                  size="sm"
                >
                  <Plus className="size-3.5" />
                  Бодлого нэмэх
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {problems.length === 0 ? (
                <p className="text-sm text-destructive">
                  ⚠ Бодлогогүй тэмцээн — оролцогчид юу ч бодож чадахгүй!
                </p>
              ) : (
                <ul className="divide-y text-sm">
                  {problems.map((p, i) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <span>
                        <span className="mr-2 font-semibold">{i + 1}.</span>
                        {p.title}
                        <span className="ml-2 inline-flex items-center gap-0.5 text-muted-foreground">
                          <Star className="size-3" />
                          {p.points}
                        </span>
                      </span>
                      <Button
                        render={<Link href={`/teacher/contests/${contestId}/problems/${p.id}`} />}
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
        )}
      </main>
    </div>
  );
}
