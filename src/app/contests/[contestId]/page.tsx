import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Lock, Star } from "lucide-react";
import { auth } from "@/auth";
import {
  contestStatus,
  getContest,
  getParticipant,
  listProblems,
} from "@/lib/db/contests";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import { registerForContest } from "@/lib/contest-actions";
import { SiteHeader } from "@/components/site-header";
import { ContestTabs } from "@/components/contest/contest-tabs";
import { ContestStatusBadge, formatWindow } from "@/components/contest/contest-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ContestProblemsPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();

  const status = contestStatus(contest);
  const [profile, participant, problems] = await Promise.all([
    getUserProfile(session.user.id).catch(() => null),
    getParticipant(contestId, session.user.id),
    listProblems(contestId),
  ]);
  const staff = isStaff(profile?.role);
  const registered = !!participant;
  // Problems stay hidden until the contest starts (staff can always see).
  const canViewProblems = staff || (registered && status !== "upcoming");

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <Button render={<Link href="/contests" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Тэмцээнүүд
          </Button>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{contest.title}</h1>
            <ContestStatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatWindow(contest.starts_at, contest.ends_at)}
          </p>
        </div>

        <ContestTabs contestId={contestId} active="problems" />

        {!registered && !staff && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-muted-foreground">
                Бодлогуудыг харахын тулд тэмцээнд бүртгүүлнэ үү.
              </p>
              {status !== "finished" && (
                <form action={registerForContest.bind(null, contestId)}>
                  <Button type="submit">Оролцох</Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {registered && !staff && status === "upcoming" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <Lock className="size-6 text-muted-foreground" />
              <p className="font-medium">Та бүртгүүлсэн — тэмцээн эхлэхээр бодлогууд нээгдэнэ.</p>
              <p className="text-sm text-muted-foreground">
                Эхлэх: {formatWindow(contest.starts_at, contest.ends_at)}
              </p>
            </CardContent>
          </Card>
        )}

        {canViewProblems && (
          <div className="space-y-3">
            {problems.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Бодлого хараахан оруулаагүй байна.
                </CardContent>
              </Card>
            )}
            {problems.map((p, i) => {
              const myScore = participant?.scores?.[p.id];
              return (
                <Link key={p.id} href={`/contests/${contestId}/problems/${p.id}`} className="block">
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold">{p.title}</h2>
                        <p className="text-sm text-muted-foreground">
                          {typeof myScore === "number"
                            ? `Таны оноо: ${myScore} / ${p.points}`
                            : `${p.points} оноо`}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Star className="size-4" />
                        {p.points}
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
