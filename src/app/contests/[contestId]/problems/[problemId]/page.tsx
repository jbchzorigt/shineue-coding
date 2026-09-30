import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { auth } from "@/auth";
import {
  contestStatus,
  getContest,
  getParticipant,
  getProblem,
  getProblemPrivate,
} from "@/lib/db/contests";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import { MdxContent } from "@/components/mdx/mdx-content";
import { SiteHeader } from "@/components/site-header";
import { ContestRunner } from "@/components/contest/contest-runner";
import { LogicConstraints } from "@/components/logic/logic-constraints";
import { LogicSolver } from "@/components/logic/logic-solver";
import { Button } from "@/components/ui/button";

export default async function ContestProblemPage({
  params,
}: {
  params: Promise<{ contestId: string; problemId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { contestId, problemId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();
  const problem = await getProblem(contestId, problemId);
  if (!problem) notFound();

  const status = contestStatus(contest);
  const [profile, participant] = await Promise.all([
    getUserProfile(session.user.id).catch(() => null),
    getParticipant(contestId, session.user.id),
  ]);
  const staff = isStaff(profile?.role);

  // Unregistered students (or before start) don't get to read problems.
  if (!staff && (!participant || status === "upcoming")) {
    redirect(`/contests/${contestId}`);
  }

  const myScore = participant?.scores?.[problem.id];
  const logicSpec = problem.kind === "logic" ? problem.logic_spec : undefined;
  const expected = logicSpec?.table_visible
    ? ((await getProblemPrivate(contestId, problem.id))?.expected_table ?? null)
    : null;

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div className="flex items-center justify-between">
          <Button
            render={<Link href={`/contests/${contestId}`} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="size-4" />
            Бодлогууд
          </Button>
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Star className="size-4" />
            {typeof myScore === "number" ? `${myScore} / ` : ""}
            {problem.points} оноо
          </span>
        </div>

        <div className="rounded-xl border bg-background p-6">
          <h1 className="mb-4 text-xl font-bold">{problem.title}</h1>
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
            <MdxContent source={problem.prompt} />
          </div>
          {logicSpec && <LogicConstraints spec={logicSpec} />}
        </div>

        {problem.kind === "logic" ? (
          logicSpec ? (
            <div className="h-[40rem] overflow-hidden rounded-lg border bg-background">
              <LogicSolver
                spec={logicSpec}
                expected={expected}
                initialCircuit={null}
                target={{
                  kind: "contest",
                  contestId,
                  problemId: problem.id,
                  disabled: !staff && status !== "running",
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-destructive">Бодлогын тохиргоо дутуу байна.</p>
          )
        ) : (
          <ContestRunner
            contestId={contestId}
            problemId={problem.id}
            initialCode={problem.starter_code ?? ""}
            disabled={!staff && status !== "running"}
          />
        )}
      </main>
    </div>
  );
}
