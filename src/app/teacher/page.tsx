import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKanban, GraduationCap, Lightbulb, Newspaper, Swords, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { canManageAccount, isStaff } from "@/lib/types";
import { listStudentOverviews } from "@/lib/db/teacher";
import { setUserRole } from "@/lib/teacher-actions";
import { DeleteUserButton } from "@/components/teacher/delete-user-button";
import { ResetPasswordButton } from "@/components/teacher/reset-password-button";
import { levelFromXp } from "@/lib/progression";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
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

  // The database role is authoritative (the JWT copy can be stale).
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const isAdmin = profile?.role === "admin";
  // The admin manages roles, so they see every account; teachers see students.
  const allUsers = await listStudentOverviews(isAdmin);
  const students = allUsers.filter((u) => u.role === "student");
  const totalPassed = students.reduce((s, x) => s + x.passed_count, 0);

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-5xl space-y-6 p-4 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <GraduationCap className="size-6" />
              Багшийн самбар
            </h1>
            <p className="text-muted-foreground">Ангийн сурагчдын явцын тойм.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/teacher/content" />} nativeButton={false} variant="outline">
              <FolderKanban className="size-4" />
              Контент удирдлага
            </Button>
            <Button render={<Link href="/teacher/contests" />} nativeButton={false} variant="outline">
              <Swords className="size-4" />
              Тэмцээн удирдлага
            </Button>
            <Button render={<Link href="/teacher/news" />} nativeButton={false}>
              <Newspaper className="size-4" />
              Мэдээний удирдлага
            </Button>
            <Button render={<Link href="/teacher/users/new" />} nativeButton={false} variant="outline">
              <UserPlus className="size-4" />
              Хэрэглэгч нэмэх
            </Button>
          </div>
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
                <TableHead className="text-right">Үйлдэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Бүртгэлтэй хэрэглэгч алга.
                  </TableCell>
                </TableRow>
              )}
              {allUsers.map((s) => (
                <TableRow key={s.uid}>
                  <TableCell>
                    <p className="font-medium">
                      {s.name ?? "—"}
                      {s.role === "teacher" && (
                        <span className="ml-2 rounded bg-sky-500/15 px-1.5 py-0.5 text-xs font-medium text-sky-700">Багш</span>
                      )}
                      {s.role === "admin" && (
                        <span className="ml-2 rounded bg-violet-500/15 px-1.5 py-0.5 text-xs font-medium text-violet-700">Админ</span>
                      )}
                      {s.locked && (
                        <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-700">Түгжигдсэн</span>
                      )}
                    </p>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canManageAccount(profile?.role, s.role) && (
                        <ResetPasswordButton uid={s.uid} name={s.name ?? s.email} />
                      )}
                      {isAdmin && s.role !== "admin" && (
                        <>
                          <form
                            action={setUserRole.bind(
                              null,
                              s.uid,
                              s.role === "teacher" ? "student" : "teacher"
                            )}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              {s.role === "teacher" ? "Сурагч болгох" : "Багш болгох"}
                            </Button>
                          </form>
                          <DeleteUserButton uid={s.uid} name={s.name} />
                        </>
                      )}
                    </div>
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
