import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";
import { NavCards, type NavLink } from "@/components/nav-cards";
import { isStaff } from "@/lib/types";

export async function SiteHeader() {
  const session = await auth();

  const links: NavLink[] = [
    { href: "/modules", label: "Модулиуд", color: "sky" },
    { href: "/leaderboard", label: "Шилдэг сурагчид", color: "amber" },
    { href: "/contests", label: "Тэмцээн", color: "violet" },
    ...(isStaff(session?.user?.role)
      ? [{ href: "/teacher", label: "Багшийн самбар", color: "emerald" as const }]
      : []),
  ];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2 lg:gap-5">
          <MobileNav links={links} />
          <Link href="/" className="truncate font-semibold">
            IBDP Computer Science
          </Link>
          <NavCards links={links} />
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
