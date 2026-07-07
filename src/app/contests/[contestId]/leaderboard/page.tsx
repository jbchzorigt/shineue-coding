import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import {
  contestStatus,
  getContest,
  listParticipants,
  listProblems,
} from "@/lib/firebase/contests";
import { SiteHeader } from "@/components/site-header";
import { ContestTabs } from "@/components/contest/contest-tabs";
import { ContestStatusBadge, formatWindow } from "@/components/contest/contest-status-badge";
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
}: {
  params: Promise<{ contestId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();

  const [problems, participants] = await Promise.all([
    listProblems(contestId),
    listParticipants(contestId),
  ]);
  const maxTotal = problems.reduce((s, p) => s + p.points, 0);

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
            <ContestStatusBadge status={contestStatus(contest)} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatWindow(contest.starts_at, contest.ends_at)}
          </p>
        </div>

        <ContestTabs contestId={contestId} active="leaderboard" />

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={problems.length + 3}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
