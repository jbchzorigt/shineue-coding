import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, Swords, Users } from "lucide-react";
import { auth } from "@/auth";
import { contestStatus, listContests, listParticipants, getParticipant } from "@/lib/firebase/contests";
import { registerForContest } from "@/lib/contest-actions";
import { SiteHeader } from "@/components/site-header";
import { ContestStatusBadge, formatWindow } from "@/components/contest/contest-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ContestsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const contests = await listContests();
  const extras = await Promise.all(
    contests.map(async (c) => ({
      participantCount: (await listParticipants(c.id)).length,
      me: await getParticipant(c.id, session.user.id),
    }))
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Swords className="size-6" />
            Тэмцээн
          </h1>
          <p className="text-muted-foreground">
            Программчлалын тэмцээнд оролцож ур чадвараа сорь!
          </p>
        </div>

        {contests.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Одоогоор зарлагдсан тэмцээн алга.
            </CardContent>
          </Card>
        )}

        {contests.map((c, i) => {
          const status = contestStatus(c);
          const registered = !!extras[i].me;
          return (
            <Card key={c.id}>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/contests/${c.id}`}
                      className="text-lg font-semibold hover:underline"
                    >
                      {c.title}
                    </Link>
                    {c.description && (
                      <p className="text-sm text-muted-foreground">{c.description}</p>
                    )}
                  </div>
                  <ContestStatusBadge status={status} />
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarClock className="size-4" />
                    {formatWindow(c.starts_at, c.ends_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4" />
                    {extras[i].participantCount} оролцогч
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {registered ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                      <CheckCircle2 className="size-4" />
                      Бүртгүүлсэн
                    </span>
                  ) : (
                    status !== "finished" && (
                      <form action={registerForContest.bind(null, c.id)}>
                        <Button type="submit" size="sm">
                          Оролцох
                        </Button>
                      </form>
                    )
                  )}
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
