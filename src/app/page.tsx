import Link from "next/link";
import { GraduationCap, Star } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { listPassedChallengeIds } from "@/lib/firebase/submissions";
import { getCourseProgress, levelFromXp } from "@/lib/progression";
import { isStaff, type UserProfile } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { NavCards, type NavLink } from "@/components/nav-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function HomePage() {
  const session = await auth();

  let profile: UserProfile | null = null;
  let passedCount = 0;
  let courseComplete = false;
  let profileError = false;
  if (session?.user?.id) {
    try {
      const [p, passedIds, progress] = await Promise.all([
        getUserProfile(session.user.id),
        listPassedChallengeIds(session.user.id),
        getCourseProgress(session.user.id),
      ]);
      profile = p;
      passedCount = passedIds.size;
      courseComplete = progress.complete;
    } catch (err) {
      console.error("Failed to load user profile:", err);
      profileError = true;
    }
  }

  const xp = profile?.total_xp ?? 0;
  const { level, progress, nextLevelXp } = levelFromXp(xp);

  const navLinks: NavLink[] = [
    { href: "/modules", label: "Модулиуд", color: "sky" },
    { href: "/leaderboard", label: "Шилдэг сурагчид", color: "amber" },
    { href: "/contests", label: "Тэмцээн", color: "violet" },
    ...(isStaff(profile?.role)
      ? [{ href: "/teacher", label: "Багшийн самбар", color: "emerald" as const }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />

      <main className="mx-auto max-w-5xl space-y-6 p-4 pt-8">
        <div>
          <h1 className="text-2xl font-bold">
            Сайн уу, {session?.user?.name?.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            IBDP CS 2027 хөтөлбөрийн сургалтын платформд тавтай морил.
          </p>
        </div>

        {profileError && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            Firestore-той холбогдож чадсангүй. .env.local доторх FIREBASE_*
            тохиргоог шалгана уу.
          </p>
        )}

        {courseComplete && (
          <Link
            href="/certificate"
            className="flex items-center gap-3 rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 transition-colors hover:bg-violet-500/20"
          >
            <GraduationCap className="size-6 shrink-0 text-violet-600" />
            <div>
              <p className="font-semibold">Баяр хүргэе — хөтөлбөр дууслаа! 🎓</p>
              <p className="text-sm text-muted-foreground">
                Сертификатаа энд дарж аваарай.
              </p>
            </div>
          </Link>
        )}

        <NavCards links={navLinks} />

        {profile && (
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Star className="size-4" />
                <span className="text-sm font-bold">{level}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-baseline justify-between text-sm">
                  <span className="font-semibold">Түвшин {level}</span>
                  <span className="text-muted-foreground">
                    {progress} / {nextLevelXp} XP дараагийн түвшин хүртэл
                  </span>
                </div>
                <Progress value={(progress / nextLevelXp) * 100} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Нийт XP</CardDescription>
              <CardTitle className="text-3xl">{profile ? xp : "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Нээгдсэн модуль</CardDescription>
              <CardTitle className="text-3xl">
                {profile?.unlocked_modules.length ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Шийдсэн бодлого</CardDescription>
              <CardTitle className="text-3xl">
                {profile ? passedCount : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <p className="text-sm text-muted-foreground">
          <Link href="/modules" className="font-medium text-foreground underline underline-offset-4">
            Модулиудын жагсаалт
          </Link>{" "}
          руу орж хичээлээ үргэлжлүүлээрэй.
        </p>
      </main>
    </div>
  );
}
