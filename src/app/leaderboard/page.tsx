import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { auth } from "@/auth";
import { listStudentOverviews } from "@/lib/firebase/teacher";
import { levelFromXp } from "@/lib/progression";
import { SiteHeader } from "@/components/site-header";
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

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Already sorted by XP descending.
  const students = await listStudentOverviews();
  const myRank = students.findIndex((s) => s.uid === session.user.id) + 1;

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="size-6 text-amber-500" />
            Шилдэг сурагчид
          </h1>
          <p className="text-muted-foreground">
            {myRank > 0
              ? `Та ${students.length} сурагчаас ${myRank}-р байранд байна.`
              : "Ангийн нийт ранк."}
          </p>
        </div>

        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Байр</TableHead>
                <TableHead>Сурагч</TableHead>
                <TableHead className="text-right">Түвшин</TableHead>
                <TableHead className="text-right">Бодсон</TableHead>
                <TableHead className="text-right">XP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Сурагч бүртгэгдээгүй байна.
                  </TableCell>
                </TableRow>
              )}
              {students.map((s, i) => {
                const isMe = s.uid === session.user.id;
                return (
                  <TableRow
                    key={s.uid}
                    className={cn(isMe && "bg-primary/5 hover:bg-primary/10")}
                  >
                    <TableCell className="text-lg">
                      {MEDALS[i] ?? <span className="pl-1.5 text-sm text-muted-foreground">{i + 1}</span>}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{s.name ?? "Сурагч"}</span>
                      {isMe && (
                        <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                          Та
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{levelFromXp(s.total_xp).level}</TableCell>
                    <TableCell className="text-right">{s.passed_count}</TableCell>
                    <TableCell className="text-right font-semibold">{s.total_xp}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          Ранк нь нийт XP-ээр эрэмбэлэгдэнэ. Даалгавар бодож XP цуглуулаарай! 🚀
        </p>
      </main>
    </div>
  );
}
