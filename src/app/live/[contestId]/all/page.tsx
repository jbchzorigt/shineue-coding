import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLiveSnapshot, getPublicContests } from "@/lib/live-cache";
import { liveView, seriesMembers } from "@/lib/live-board";
import { contestStatus } from "@/lib/contest-status";
import { divisionLabel } from "@/lib/contest-division";
import { SiteHeader } from "@/components/site-header";
import { AutoRefresh } from "@/components/live/auto-refresh";
import { Countdown } from "@/components/live/countdown";
import { LiveListRow } from "@/components/live/live-table";
import { LiveDot, LiveRefreshIcon } from "@/components/live/motion";
import { cn } from "@/lib/utils";

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
  const running = members.some((c) => contestStatus(c) === "running");

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <AutoRefresh until={endsAt} />
      <main className="mx-auto max-w-[1800px] space-y-6 p-4 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold lg:text-4xl 2xl:text-5xl">{members[0].series}</h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2 text-lg font-semibold text-foreground lg:text-2xl">
              {running && <LiveDot />}
              <Countdown startsAt={startsAt} endsAt={endsAt} />
            </span>
            <span className="flex items-center gap-1">
              <LiveRefreshIcon className="size-3.5" />
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
                // Positioned, so rows measure their place against the list (see useRowMotion).
                <ol className="relative divide-y">
                  {rows.map((r) => (
                    <LiveListRow key={r.key} row={r} />
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
