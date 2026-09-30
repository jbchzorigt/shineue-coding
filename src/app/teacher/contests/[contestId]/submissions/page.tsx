import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import {
  getContest,
  listParticipants,
  listProblems,
  type ContestProblem,
  type Participant,
} from "@/lib/db/contests";
import { bestSubmissions, listContestSubmissions } from "@/lib/db/contest-submissions";
import { findSimilarPairs } from "@/lib/plagiarism/pairs";
import {
  parseSubmissionsQuery,
  submissionsHref,
  type SubmissionsQuery,
  type SubmissionsTab,
} from "@/lib/submissions-query";
import { isStaff } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/site-header";
import { SimilarPairs, SubmissionList } from "@/components/teacher/contest-submissions";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 100;
const TABS: [SubmissionsTab, string][] = [
  ["attempts", "Илгээлтүүд"],
  ["similar", "Хуулбар сэжиг"],
];
const SELECT = "border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export default async function ContestSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) notFound();

  const [problems, participants] = await Promise.all([
    listProblems(contestId),
    listParticipants(contestId),
  ]);
  const query = parseSubmissionsQuery(await searchParams, {
    studentIds: participants.map((p) => p.uid),
    problemIds: problems.map((p) => p.id),
  });
  const base = `/teacher/contests/${contestId}/submissions`;
  const exportHref = (type: "results" | "attempts") =>
    `/api/teacher/contests/${contestId}/export?type=${type}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-6 p-4 pt-8">
        <div className="space-y-2">
          <Button render={<Link href={`/teacher/contests/${contestId}`} />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Тэмцээн удирдлага
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{contest.title}: илгээлтүүд</h1>
            <div className="flex flex-wrap gap-2">
              <Button render={<a href={exportHref("results")} download />} nativeButton={false} variant="outline" size="sm">
                <Download className="size-3.5" />
                Дүн (CSV)
              </Button>
              <Button render={<a href={exportHref("attempts")} download />} nativeButton={false} variant="outline" size="sm">
                <Download className="size-3.5" />
                Бүх оролдлого (CSV)
              </Button>
            </div>
          </div>
        </div>

        <nav aria-label="Харагдац" className="flex gap-1 border-b">
          {TABS.map(([id, label]) => (
            <Link
              key={id}
              href={submissionsHref(base, { ...query, tab: id, page: 1 })}
              aria-current={query.tab === id ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                query.tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {query.tab === "attempts" ? (
          <AttemptsTab contestId={contestId} base={base} query={query} problems={problems} participants={participants} />
        ) : (
          <SimilarTab contestId={contestId} problems={problems} />
        )}
      </main>
    </div>
  );
}

async function AttemptsTab({
  contestId,
  base,
  query,
  problems,
  participants,
}: {
  contestId: string;
  base: string;
  query: SubmissionsQuery;
  problems: ContestProblem[];
  participants: Participant[];
}) {
  const { rows, total } = await listContestSubmissions(contestId, {
    uid: query.student,
    problemId: query.problem,
    limit: PAGE_SIZE,
    offset: (query.page - 1) * PAGE_SIZE,
  });
  const from = (query.page - 1) * PAGE_SIZE + 1;
  const to = from + rows.length - 1;

  return (
    <div className="space-y-4">
      <form method="get" action={base} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Сурагч</span>
          <select name="student" defaultValue={query.student ?? ""} className={SELECT}>
            <option value="">Бүгд</option>
            {participants.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.name ?? p.email}
                {p.class_name ? ` (${p.class_name})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Бодлого</span>
          <select name="problem" defaultValue={query.problem ?? ""} className={SELECT}>
            <option value="">Бүгд</option>
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline">
          Шүүх
        </Button>
      </form>

      <SubmissionList rows={rows} problems={problems} />

      {(rows.length > 0 || query.page > 1) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{rows.length > 0 ? `${from}–${to} / ${total}` : `0 / ${total}`}</span>
          <div className="flex gap-4">
            {query.page > 1 && (
              <Link href={submissionsHref(base, { ...query, page: query.page - 1 })} className="hover:text-foreground">
                ← Өмнөх
              </Link>
            )}
            {to < total && rows.length > 0 && (
              <Link href={submissionsHref(base, { ...query, page: query.page + 1 })} className="hover:text-foreground">
                Дараах →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function SimilarTab({ contestId, problems }: { contestId: string; problems: ContestProblem[] }) {
  const best = await bestSubmissions(contestId);
  const groups = problems.map((problem) => ({
    problem,
    ...findSimilarPairs(
      problem.kind,
      best
        .filter((r) => r.problem_id === problem.id)
        .map((r) => ({
          uid: r.uid,
          name: `${r.name ?? r.email}${r.class_name ? ` (${r.class_name})` : ""}`,
          score: r.score,
          answer: r.code,
        })),
      { starterCode: problem.starter_code }
    ),
  }));
  return <SimilarPairs groups={groups} />;
}
