import { redirect } from "next/navigation";
import { GraduationCap, Lightbulb } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
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
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function TeacherPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // The Firestore role is authoritative (the JWT copy can be stale).
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (profile?.role !== "teacher") redirect("/");

  const students = await listStudentOverviews();
  const totalPassed = students.reduce((s, x) => s + x.passed_count, 0);

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-6 p-4 pt-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GraduationCap className="size-6" />
            Багшийн самбар
          </h1>
          <p className="text-muted-foreground">Ангийн сурагчдын явцын тойм.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Нийт сурагч</CardDescription>
              <CardTitle className="text-3xl">{students.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Нийт шийдсэн бодлого</CardDescription>
              <CardTitle className="text-3xl">{totalPassed}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Дундаж XP</CardDescription>
              <CardTitle className="text-3xl">
                {students.length
                  ? Math.round(students.reduce((s, x) => s + x.total_xp, 0) / students.length)
                  : 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сурагч</TableHead>
                <TableHead className="text-right">XP</TableHead>
                <TableHead className="text-right">Түвшин</TableHead>
                <TableHead className="text-right">Модуль</TableHead>
                <TableHead className="text-right">Бодсон</TableHead>
                <TableHead className="text-right">Оролдлого</TableHead>
                <TableHead className="text-right">
                  <span className="inline-flex items-center gap-1">
                    <Lightbulb className="size-3.5" />
                    Hint
                  </span>
                </TableHead>
                <TableHead className="text-right">Сүүлд нэвтэрсэн</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Бүртгэлтэй сурагч алга.
                  </TableCell>
                </TableRow>
              )}
              {students.map((s) => (
                <TableRow key={s.uid}>
                  <TableCell>
                    <p className="font-medium">{s.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </TableCell>
                  <TableCell className="text-right font-medium">{s.total_xp}</TableCell>
                  <TableCell className="text-right">{levelFromXp(s.total_xp).level}</TableCell>
                  <TableCell className="text-right">{s.unlocked_count}</TableCell>
                  <TableCell className="text-right">{s.passed_count}</TableCell>
                  <TableCell className="text-right">{s.total_attempts}</TableCell>
                  <TableCell className="text-right">{s.hints_used}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {s.last_login ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
