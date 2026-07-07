import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { isStaff } from "@/lib/types";
import { listModules } from "@/lib/firebase/modules";
import { getChallenge, getChallengePrivate } from "@/lib/firebase/challenges";
import { SiteHeader } from "@/components/site-header";
import { ChallengeForm } from "@/components/teacher/challenge-form";
import { Button } from "@/components/ui/button";

export default async function EditChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ challengeId: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { challengeId } = await params;
  const { module: moduleParam } = await searchParams;
  const isNew = challengeId === "new";

  const [challenge, privateData, modules] = await Promise.all([
    isNew ? null : getChallenge(challengeId),
    isNew ? null : getChallengePrivate(challengeId),
    listModules(),
  ]);
  if (!isNew && !challenge) notFound();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <Button
            render={<Link href="/teacher/content" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="size-4" />
            Контент удирдлага
          </Button>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? "Шинэ даалгавар" : `Даалгавар засах: ${challenge!.title}`}
          </h1>
        </div>
        <div className="rounded-xl border bg-background p-6">
          <ChallengeForm
            challenge={challenge}
            privateData={privateData}
            defaultModuleId={moduleParam ?? modules[0]?.id ?? ""}
            moduleIds={modules.map((m) => m.id)}
          />
        </div>
      </main>
    </div>
  );
}
