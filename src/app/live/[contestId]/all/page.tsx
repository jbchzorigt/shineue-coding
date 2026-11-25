import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { auth } from "@/auth";
import { getLiveSnapshot, getPublicContests } from "@/lib/live-cache";
import { liveView, seriesMembers } from "@/lib/live-board";
import { divisionLabel } from "@/lib/contest-division";
import { SiteHeader } from "@/components/site-header";
import { ClassTag } from "@/components/class-filter";
import { AutoRefresh } from "@/components/live/auto-refresh";
import { Countdown } from "@/components/live/countdown";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];
const TOP = 10;
/** Fill the hall screen whatever the number of divisions (literal classes for Tailwind). */
const COLUMNS: Record<number, string> = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" };

/** Every public division of a series side by side — the hall screen. */
export default async function LiveSeriesPage({ params }: { params: Promise<{ contestId: string }> }) {
  const { contestId } = await params;
  const members = seriesMembers(await getPublicContests(), contestId);
  if (!members) notFound();
  if (members.length === 1) redirect(`/live/${contestId}`);

  const session = await auth();
  const viewer = { uid: session?.user?.id ?? null };
  const boards = (
    await Promise.all(
      members.map(async (c) => {
        const snap = await getLiveSnapshot(c.id);
        return snap ? { contest: c, rows: liveView(snap, viewer).rows.slice(0, TOP) } : null;
      })
    )
  ).filter((b) => b !== null);
  const startsAt = Math.min(...members.map((c) => c.starts_at));
  const endsAt = Math.max(...members.map((c) => c.ends_at));

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <AutoRefresh until={endsAt} />
      <main className="mx-auto max-w-[1800px] space-y-6 p-4 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold lg:text-4xl 2xl:text-5xl">{members[0].series}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="text-lg font-semibold text-foreground lg:text-2xl">
              <Countdown startsAt={startsAt} endsAt={endsAt} />
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="size-3.5" />
              15 с тутам шинэчлэгдэнэ
            </span>
          </p>
        </div>

        <div className={cn("grid gap-4 md:grid-cols-2", COLUMNS[boards.length] ?? "lg:grid-cols-4")}>
          {boards.map(({ contest, rows }) => (
            <section key={contest.id} className="rounded-xl border bg-background p-4">
              <h2 className="mb-3 text-lg font-bold lg:text-xl 2xl:text-3xl">
                <Link href={`/live/${contest.id}`} className="hover:underline">
                  {divisionLabel(contest)}
                </Link>
              </h2>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Оролцогч бүртгүүлээгүй байна.</p>
              ) : (
                <ol className="divide-y">
                  {rows.map((r) => (
                    <li key={r.rank} className="flex items-center justify-between gap-2 py-1.5 lg:text-lg 2xl:py-2.5 2xl:text-2xl">
                      <span className="min-w-0 truncate">
                        <span className="inline-block w-8">
                          {MEDALS[r.rank - 1] ?? <span className="text-sm text-muted-foreground">{r.rank}</span>}
                        </span>
                        <span className="font-medium">{r.name}</span>
                        <ClassTag value={r.class_name} />
                      </span>
                      <span className="font-bold tabular-nums">{r.total}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
