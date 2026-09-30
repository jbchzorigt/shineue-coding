import Link from "next/link";
import { ArrowRight, GraduationCap, LogIn, Newspaper, Star } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { listPassedChallengeIds } from "@/lib/db/submissions";
import { listNews } from "@/lib/db/news";
import { categoryFromParam } from "@/lib/news-categories";
import { getCourseProgress, levelFromXp, openModules } from "@/lib/progression";
import { isStaff, type UserProfile } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { NavCards, type NavLink } from "@/components/nav-cards";
import { NewsList } from "@/components/news/news-list";
import { NewsCategoryFilter } from "@/components/news/news-category";
import { HeroStencilTitle } from "@/components/landing/hero-stencil-title";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const session = await auth();
  const category = categoryFromParam((await searchParams).category);
  const emptyText = category ? "Энэ ангилалд мэдээ алга." : undefined;

  // Public landing for visitors: hero + news + sign-in.
  if (!session?.user?.id) {
    const posts = await listNews({ category, limit: 5 }).catch(() => []);
    return (
      <div className="min-h-screen bg-muted/40">
        <SiteHeader />
        <main className="mx-auto max-w-3xl space-y-10 p-4 pt-12">
          <section className="space-y-4 text-center">
            <HeroStencilTitle text="IBDP Computer Science" />
            <p className="mx-auto max-w-xl text-muted-foreground">
              IBDP CS 2027 хөтөлбөрийн интерактив сургалтын платформ — хичээл
              уншиж, кодоо шууд бичиж шалгуулан, XP цуглуулж, тэмцээнд оролцоорой.
            </p>
            <Button render={<Link href="/login" />} nativeButton={false} size="lg">
              <LogIn className="size-4" />
              Сургуулийн имэйлээр нэвтрэх
            </Button>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Newspaper className="size-5" />
              Мэдээ, зарлал
            </h2>
            <NewsCategoryFilter active={category} basePath="/" />
            <NewsList posts={posts} emptyText={emptyText} />
          </section>
        </main>
      </div>
    );
  }

  let profile: UserProfile | null = null;
  let passedCount = 0;
  let openCount = 0;
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
      openCount = p
        ? isStaff(p.role)
          ? p.unlocked_modules.length
          : (await openModules(p.uid, p.unlocked_modules)).length
        : 0;
      courseComplete = progress.complete;
    } catch (err) {
      console.error("Failed to load user profile:", err);
      profileError = true;
    }
  }

  const latestNews = await listNews({ category, limit: 3 }).catch(() => []);

  const xp = profile?.total_xp ?? 0;
  const { level, progress, nextLevelXp } = levelFromXp(xp);

  const navLinks: NavLink[] = [
    { href: "/modules", label: "Модулиуд", color: "sky" },
    { href: "/leaderboard", label: "Шилдэг сурагчид", color: "amber" },
    { href: "/contests", label: "Тэмцээн", color: "violet" },
    { href: "/news", label: "Мэдээ", color: "rose" },
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
            Өгөгдлийн сантай холбогдож чадсангүй. Docker (npm run db:up) ажиллаж
            байгаа эсэх, .env.local доторх DATABASE_URL-ийг шалгана уу.
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
                {profile ? openCount : "—"}
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

        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Newspaper className="size-5" />
              Мэдээ, зарлал
            </h2>
            <Link
              href={category ? `/news?category=${category}` : "/news"}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Бүх мэдээ
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <NewsCategoryFilter active={category} basePath="/" />
          <NewsList posts={latestNews} emptyText={emptyText} />
        </section>
      </main>
    </div>
  );
}
