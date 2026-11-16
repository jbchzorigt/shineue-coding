import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import { getContest, getProblem, getProblemPrivate, listContests } from "@/lib/db/contests";
import { divisionLabel } from "@/lib/contest-division";
import { CopyProblemForm } from "@/components/teacher/copy-problem-form";
import { SiteHeader } from "@/components/site-header";
import { ContestProblemForm } from "@/components/teacher/contest-problem-form";
import { Button } from "@/components/ui/button";

export default async function EditContestProblemPage({
  params,
}: {
  params: Promise<{ contestId: string; problemId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { contestId, problemId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();

  const isNew = problemId === "new";
  const [problem, privateData] = isNew
    ? [null, null]
    : await Promise.all([
        getProblem(contestId, problemId),
        getProblemPrivate(contestId, problemId),
      ]);
  if (!isNew && !problem) notFound();

  // Copy targets: every other contest, this series first.
  const others = isNew ? [] : (await listContests()).filter((c) => c.id !== contestId);
  const sameSeries = (c: (typeof others)[number]) => !!contest.series && c.series === contest.series;
  const targets = [...others.filter(sameSeries), ...others.filter((c) => !sameSeries(c))].map((c) => ({
    id: c.id,
    label: `${c.title} (${divisionLabel(c)})`,
  }));

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <Button
            render={<Link href={`/teacher/contests/${contestId}`} />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="size-4" />
            {contest.title}
          </Button>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? "Шинэ бодлого" : `Бодлого засах: ${problem!.title}`}
          </h1>
        </div>
        <div className="rounded-xl border bg-background p-6">
          <ContestProblemForm
            contestId={contestId}
            problem={problem}
            privateData={privateData}
          />
        </div>
        {!isNew && (
          <div className="rounded-xl border bg-background p-6 text-sm">
            <CopyProblemForm contestId={contestId} problemId={problemId} targets={targets} />
          </div>
        )}
      </main>
    </div>
  );
}
