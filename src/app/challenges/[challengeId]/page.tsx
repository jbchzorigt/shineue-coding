import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { getChallenge, getChallengePrivate } from "@/lib/db/challenges";
import { getUserProfile } from "@/lib/db/users";
import { getSubmission } from "@/lib/db/submissions";
import type { Challenge } from "@/lib/types";
import { canOpenModule } from "@/lib/progression";
import { parseCircuit } from "@/lib/logic/circuit";
import { MdxContent } from "@/components/mdx/mdx-content";
import { UserMenu } from "@/components/user-menu";
import { SiteHeader } from "@/components/site-header";
import { ChallengeWorkspace } from "@/components/challenge/challenge-workspace";
import { ChallengeQuiz } from "@/components/challenge/challenge-quiz";
import { LogicWorkspace } from "@/components/logic/logic-workspace";
import { Button } from "@/components/ui/button";

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { challengeId } = await params;
  const challenge = await getChallenge(challengeId);
  if (!challenge) notFound();

  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!(await canOpenModule(profile, challenge.module_id))) redirect(`/modules/${challenge.module_id}`);

  const submission = await getSubmission(session.user.id, challengeId);

  if (challenge.type === "logic") {
    const spec = challenge.logic_spec;
    // The expected table leaves the server only when the problem shows it.
    const expected = spec?.table_visible
      ? ((await getChallengePrivate(challenge.id))?.expected_table ?? null)
      : null;
    const saved = submission?.code_snapshot ? parseCircuit(submission.code_snapshot) : null;
    return (
      <div className="flex h-screen flex-col overflow-hidden max-lg:h-auto max-lg:overflow-visible">
        <WorkspaceHeader challenge={challenge} />
        {spec ? (
          <LogicWorkspace
            challengeId={challenge.id}
            spec={spec}
            expected={expected}
            initialCircuit={saved?.ok ? saved.circuit : null}
            alreadyPassed={submission?.passed ?? false}
            hasHint={challenge.has_hint ?? false}
            hintAlreadyUsed={submission?.hint_used ?? false}
            description={
              <>
                <h1>{challenge.title}</h1>
                <MdxContent source={challenge.prompt} />
              </>
            }
          />
        ) : (
          <p className="p-6 text-sm text-destructive">Бодлогын тохиргоо дутуу байна.</p>
        )}
      </div>
    );
  }

  // Non-coding challenges use a simple quiz layout.
  if (challenge.type !== "coding") {
    return (
      <div className="min-h-screen bg-muted/40">
        <SiteHeader />
        <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
          <div className="flex items-center justify-between">
            <Button
              render={<Link href={`/modules/${challenge.module_id}`} />}
              nativeButton={false}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="size-4" />
              Хичээл рүү буцах
            </Button>
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Trophy className="size-4" />
              {challenge.xp_reward} XP
            </span>
          </div>

          <div className="rounded-xl border bg-background p-6">
            <h1 className="mb-4 text-xl font-bold">{challenge.title}</h1>
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
              <MdxContent source={challenge.prompt} />
            </div>
          </div>

          <ChallengeQuiz
            challengeId={challenge.id}
            type={challenge.type}
            options={challenge.options}
            alreadyPassed={submission?.passed ?? false}
            initialAnswer={
              challenge.type === "mcq" ? "" : (submission?.code_snapshot ?? "")
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <WorkspaceHeader challenge={challenge} />

      <ChallengeWorkspace
        challengeId={challenge.id}
        initialCode={submission?.code_snapshot ?? challenge.starter_code ?? ""}
        alreadyPassed={submission?.passed ?? false}
        hasHint={challenge.has_hint ?? false}
        hintAlreadyUsed={submission?.hint_used ?? false}
        description={
          <>
            <h1>{challenge.title}</h1>
            <MdxContent source={challenge.prompt} />
          </>
        }
      />
    </div>
  );
}

function WorkspaceHeader({ challenge }: { challenge: Challenge }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          render={<Link href={`/modules/${challenge.module_id}`} />}
          nativeButton={false}
          variant="ghost"
          size="sm"
        >
          <ArrowLeft className="size-4" />
          <span className="max-sm:hidden">Хичээл</span>
        </Button>
        <span className="truncate font-semibold">{challenge.title}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Trophy className="size-4" />
          {challenge.xp_reward} XP
        </span>
        <UserMenu />
      </div>
    </header>
  );
}
