import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import {
  contestStatus,
  getContest,
  listParticipants,
  listProblems,
} from "@/lib/db/contests";
import { scoreEvents } from "@/lib/db/contest-submissions";
import { pickRacers, raceEnd, scoreTimeline } from "@/lib/contest-timeline";
import { classFromParam, classOptions } from "@/lib/class-name";
import { ClassFilter, ClassTag } from "@/components/class-filter";
import { SiteHeader } from "@/components/site-header";
import { ContestTabs } from "@/components/contest/contest-tabs";
import { ScoreRaceChart, type RaceSeries } from "@/components/contest/score-race-chart";
import { ContestStatusBadge, formatTime, formatWindow } from "@/components/contest/contest-status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ContestLeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<{ class?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();

  const [problems, everyone, events] = await Promise.all([
    listProblems(contestId),
    listParticipants(contestId),
    scoreEvents(contestId),
  ]);
  // Ranked already; a class filter keeps that order and renumbers.
  const classes = classOptions(everyone.map((p) => p.class_name));
  const active = classFromParam((await searchParams).class, classes);
  const participants = active ? everyone.filter((p) => p.class_name === active) : everyone;
  const maxTotal = problems.reduce((s, p) => s + p.points, 0);

  // Score race: the first ten of this (filtered) ranking, plus me if I'm lower.
  const status = contestStatus(contest);
  const chartEnd = raceEnd(contest.ends_at);
  const lines = scoreTimeline(events, contest.starts_at, chartEnd);
  const byUid = new Map(participants.map((p) => [p.uid, p]));
  const racers = pickRacers(
    participants.map((p) => p.uid).filter((uid) => lines.has(uid)),
    session.user.id
  );
  const race: RaceSeries[] = racers.map((uid) => ({
    name: byUid.get(uid)?.name ?? "Оролцогч",
    data: lines.get(uid)!,
    mine: uid === session.user.id,
  }));

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-4xl space-y-6 p-4 pt-8">
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

        <ContestTabs contestId={contestId} active="leaderboard" />

        <ClassFilter options={classes} active={active} basePath={`/contests/${contestId}/leaderboard`} />

        {status !== "upcoming" && race.length > 0 && (
          <section className="rounded-xl border bg-background p-4">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <TrendingUp className="size-4" />
              Онооны явц
            </h2>
            <ScoreRaceChart series={race} start={contest.starts_at} end={chartEnd} maxTotal={maxTotal} />
          </section>
        )}

        <div className="overflow-x-auto rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Байр</TableHead>
                <TableHead>Оролцогч</TableHead>
                {problems.map((p, i) => (
                  <TableHead key={p.id} className="text-right" title={p.title}>
                    Б{i + 1}
                    <span className="block text-[10px] font-normal text-muted-foreground">
                      /{p.points}
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-right">
                  Нийт
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    /{maxTotal}
                  </span>
                </TableHead>
                <TableHead className="text-right">Цаг</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={problems.length + 4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Оролцогч бүртгүүлээгүй байна.
                  </TableCell>
                </TableRow>
              )}
              {participants.map((p, i) => {
                const isMe = p.uid === session.user.id;
                return (
                  <TableRow key={p.uid} className={cn(isMe && "bg-primary/5 hover:bg-primary/10")}>
                    <TableCell className="text-lg">
                      {MEDALS[i] ?? (
                        <span className="pl-1.5 text-sm text-muted-foreground">{i + 1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{p.name ?? "Оролцогч"}</span>
                      <ClassTag value={p.class_name} />
                      {isMe && (
                        <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                          Та
                        </span>
                      )}
                    </TableCell>
                    {problems.map((pr) => {
                      const score = p.scores?.[pr.id];
                      return (
                        <TableCell
                          key={pr.id}
                          className={cn(
                            "text-right",
                            score === pr.points && "font-semibold text-emerald-600",
                            score === undefined && "text-muted-foreground"
                          )}
                        >
                          {score ?? "—"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold">{p.total}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {p.last_improved_at ? formatTime(p.last_improved_at) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          «Цаг» — оноогоо сүүлд ахиулсан мөч. Нийт оноо тэнцсэн үед оноогоо
          <strong> түрүүлж бүрдүүлсэн</strong> оролцогч дээгүүр эрэмбэлэгдэнэ. ⏱
        </p>
      </main>
    </div>
  );
}
