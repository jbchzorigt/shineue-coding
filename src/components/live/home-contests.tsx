import Link from "next/link";
import { ArrowRight, LayoutGrid, Trophy } from "lucide-react";
import type { Contest } from "@/lib/db/contests";
import type { ContestGroup } from "@/lib/contest-division";
import type { HomeBoard } from "@/lib/live-board";
import { divisionLabel } from "@/lib/contest-division";
import { formatWindow } from "@/components/contest/contest-status-badge";
import { Countdown } from "@/components/live/countdown";
import { cn } from "@/lib/utils";

type Kind = "running" | "upcoming" | "finished";

const BADGE: Record<Kind, { text: string; className: string }> = {
  running: { text: "● ЯГ ОДОО", className: "bg-rose-600 text-white" },
  upcoming: { text: "Удахгүй", className: "bg-sky-500/15 text-sky-700" },
  finished: { text: "Дууссан", className: "bg-muted text-muted-foreground" },
};

function GroupCard({ group, kind }: { group: ContestGroup<Contest>; kind: Kind }) {
  const first = group.contests[0];
  const startsAt = Math.min(...group.contests.map((c) => c.starts_at));
  const endsAt = Math.max(...group.contests.map((c) => c.ends_at));
  return (
    <div className="space-y-3 rounded-xl border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", BADGE[kind].className)}>
          {BADGE[kind].text}
        </span>
        <h3 className="font-semibold">{group.series ?? first.title}</h3>
      </div>
      <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>{formatWindow(startsAt, endsAt)}</span>
        {kind !== "finished" && (
          <span className="font-medium text-foreground">
            <Countdown startsAt={startsAt} endsAt={endsAt} />
          </span>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {kind === "finished" && <span className="text-sm font-medium">Дүн харах:</span>}
        {group.contests.map((c) => (
          <Link
            key={c.id}
            href={`/live/${c.id}`}
            className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/70"
          >
            {group.series ? divisionLabel(c) : "Харах"}
            <ArrowRight className="size-3.5" />
          </Link>
        ))}
        {group.contests.length > 1 && (
          <Link
            href={`/live/${first.id}/all`}
            className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <LayoutGrid className="size-3.5" />
            Бүгдийг харах
          </Link>
        )}
      </div>
    </div>
  );
}

/** The home page's «Тэмцээн» section: public contests anyone may watch live. */
export function HomeContests({ board }: { board: HomeBoard }) {
  const { running, upcoming, finished } = board;
  if (running.length === 0 && !upcoming && !finished) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Trophy className="size-5" />
        Тэмцээн
      </h2>
      {running.map((g) => (
        <GroupCard key={g.series ?? g.contests[0].id} group={g} kind="running" />
      ))}
      {upcoming && <GroupCard group={upcoming} kind="upcoming" />}
      {finished && <GroupCard group={finished} kind="finished" />}
    </section>
  );
}
