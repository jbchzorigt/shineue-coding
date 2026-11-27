import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutGrid, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { getLiveSnapshot, getPublicContests } from "@/lib/live-cache";
import { divisionShape, liveView, seriesMembers } from "@/lib/live-board";
import { divisionLabel } from "@/lib/contest-division";
import { SiteHeader } from "@/components/site-header";
import { ScoreRaceChart } from "@/components/contest/score-race-chart";
import { ContestStatusBadge, formatWindow } from "@/components/contest/contest-status-badge";
import { AutoRefresh } from "@/components/live/auto-refresh";
import { Countdown } from "@/components/live/countdown";
import { DivisionShape } from "@/components/live/division-shape";
import { LiveTable } from "@/components/live/live-table";
import { LiveDot, LiveRefreshIcon } from "@/components/live/motion";
import { cn } from "@/lib/utils";

/** One division's public, self-refreshing board. */
export default async function LiveContestPage({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params;
  const members = seriesMembers(await getPublicContests(), contestId);
  const snap = members ? await getLiveSnapshot(contestId) : null;
  if (!members || !snap) notFound();

  const session = await auth();
  const view = liveView(snap, { uid: session?.user?.id ?? null });
  const { contest } = snap;
  const showChart = view.status !== "upcoming" && view.race.length > 0;

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <AutoRefresh until={contest.ends_at} />
      <main className="mx-auto max-w-4xl space-y-6 p-4 pt-8 lg:max-w-7xl">
        <div className="flex items-start gap-4">
          <DivisionShape index={divisionShape(members, contest.id)} className="size-14 lg:size-20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold lg:text-3xl">{contest.title}</h1>
              <span className="flex items-center gap-2">
                {view.status === "running" && <LiveDot />}
                <ContestStatusBadge status={view.status} />
              </span>
            </div>
            {(contest.series || contest.grade_min !== null) && (
              <p className="text-sm font-medium lg:text-base">
                {[contest.series, divisionLabel(contest)].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span>{formatWindow(contest.starts_at, contest.ends_at)}</span>
              <span className="font-semibold text-foreground lg:text-lg">
                <Countdown startsAt={contest.starts_at} endsAt={contest.ends_at} />
              </span>
              <span className="flex items-center gap-1">
                <LiveRefreshIcon className="size-3.5" />
                15 с тутам шинэчлэгдэнэ
              </span>
            </p>
          </div>
        </div>

        {members.length > 1 && (
          <nav className="flex flex-wrap gap-2">
            {members.map((m) => (
              <Link
                key={m.id}
                href={`/live/${m.id}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm font-medium",
                  m.id === contest.id ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                )}
              >
                {divisionLabel(m)}
              </Link>
            ))}
            <Link
              href={`/live/${contest.id}/all`}
              className="flex items-center gap-1 rounded-full border bg-background px-3 py-1 text-sm font-medium hover:bg-muted"
            >
              <LayoutGrid className="size-3.5" />
              Бүгдийг харах
            </Link>
          </nav>
        )}

        {/* Stacked on every screen: the chart above, the ranking below. */}
        <div className="grid gap-6">
          {showChart && (
            <section className="rounded-xl border bg-background p-4">
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <TrendingUp className="size-4" />
                Онооны явц
              </h2>
              <ScoreRaceChart series={view.race} start={contest.starts_at} end={view.chartEnd} maxTotal={view.maxTotal} />
            </section>
          )}
          <LiveTable rows={view.rows} problems={view.problems} maxTotal={view.maxTotal} />
        </div>
      </main>
    </div>
  );
}
