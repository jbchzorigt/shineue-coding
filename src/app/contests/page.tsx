import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock, Plus, Swords, Users, XCircle } from "lucide-react";
import { auth } from "@/auth";
import {
  contestStatus,
  getParticipant,
  listContests,
  listParticipants,
  type Contest,
  type ContestStatus,
  type ParticipantStatus,
} from "@/lib/db/contests";
import { getUserProfile } from "@/lib/db/users";
import { divisionEligibility, divisionLabel, groupContests } from "@/lib/contest-division";
import { isStaff } from "@/lib/types";
import { registerForContest } from "@/lib/contest-actions";
import { SiteHeader } from "@/components/site-header";
import { StaffLink } from "@/components/staff-link";
import { ContestStatusBadge, formatWindow } from "@/components/contest/contest-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Entry {
  contest: Contest;
  status: ContestStatus;
  participantCount: number;
  myStatus: ParticipantStatus | undefined;
  /** Out of this division's grade range (students only). */
  ineligible: boolean;
}

/** My registration state, or the «Оролцох» button when I may still join. */
function JoinState({ entry }: { entry: Entry }) {
  const { contest, status, myStatus, ineligible } = entry;
  if (myStatus === "approved") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <CheckCircle2 className="size-4" />
        Бүртгүүлсэн
      </span>
    );
  }
  if (myStatus === "pending") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
        <Clock className="size-4" />
        Хүлээгдэж байна
      </span>
    );
  }
  if (myStatus === "rejected") {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <XCircle className="size-4" />
        Татгалзсан
      </span>
    );
  }
  if (status === "finished") return null;
  if (ineligible) return <span className="text-sm text-muted-foreground">Таны ангид хамаарахгүй</span>;
  return (
    <form action={registerForContest.bind(null, contest.id)}>
      <Button type="submit" size="sm">
        Оролцох
      </Button>
    </form>
  );
}

function Meta({ entry }: { entry: Entry }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <CalendarClock className="size-4" />
        {formatWindow(entry.contest.starts_at, entry.contest.ends_at)}
      </span>
      <span className="flex items-center gap-1.5">
        <Users className="size-4" />
        {entry.participantCount} оролцогч
      </span>
    </div>
  );
}

export default async function ContestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [contests, profile] = await Promise.all([
    listContests(),
    getUserProfile(session.user.id).catch(() => null),
  ]);
  const staff = isStaff(profile?.role);
  const entries = new Map<string, Entry>(
    await Promise.all(
      contests.map(async (c): Promise<[string, Entry]> => [
        c.id,
        {
          contest: c,
          status: contestStatus(c),
          participantCount: (await listParticipants(c.id)).length,
          myStatus: (await getParticipant(c.id, session.user.id))?.status,
          ineligible: !staff && divisionEligibility(c, profile?.class_name ?? null).kind === "ineligible",
        },
      ])
    )
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Swords className="size-6" />
              Тэмцээн
            </h1>
            <p className="text-muted-foreground">
              Программчлалын тэмцээнд оролцож ур чадвараа сорь!
            </p>
          </div>
          <StaffLink href="/teacher/contests/new">
            <Plus className="size-4" />
            Шинэ тэмцээн
          </StaffLink>
        </div>

        {contests.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Одоогоор зарлагдсан тэмцээн алга.
            </CardContent>
          </Card>
        )}

        {groupContests(contests).map((group) => {
          if (group.series) {
            return (
              <Card key={`series:${group.series}`}>
                <CardContent className="space-y-3">
                  <h2 className="text-lg font-semibold">{group.series}</h2>
                  <ul className="divide-y">
                    {group.contests.map((c) => {
                      const entry = entries.get(c.id)!;
                      return (
                        <li key={c.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/contests/${c.id}`} className="font-semibold hover:underline">
                              {divisionLabel(c)}
                            </Link>
                            <ContestStatusBadge status={entry.status} />
                          </div>
                          <Meta entry={entry} />
                          <JoinState entry={entry} />
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          }
          const c = group.contests[0];
          const entry = entries.get(c.id)!;
          return (
            <Card key={c.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/contests/${c.id}`} className="text-lg font-semibold hover:underline">
                      {c.title}
                    </Link>
                    {(c.grade_min !== null || c.description) && (
                      <p className="text-sm text-muted-foreground">
                        {c.grade_min !== null && <span className="mr-2 font-medium">{divisionLabel(c)}</span>}
                        {c.description}
                      </p>
                    )}
                  </div>
                  <ContestStatusBadge status={entry.status} />
                </div>
                <Meta entry={entry} />
                <div className="flex items-center gap-3">
                  <JoinState entry={entry} />
                  <Button
                    render={<Link href={`/contests/${c.id}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    Дэлгэрэнгүй
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
