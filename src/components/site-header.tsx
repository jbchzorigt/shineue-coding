import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/user-menu";
import { MobileNav } from "@/components/mobile-nav";
import { isStaff } from "@/lib/types";

export async function SiteHeader() {
  const session = await auth();

  const links = [
    { href: "/modules", label: "Модулиуд" },
    { href: "/leaderboard", label: "Шилдэг сурагчид" },
    { href: "/contests", label: "Тэмцээн" },
    ...(isStaff(session?.user?.role)
      ? [{ href: "/teacher", label: "Багшийн самбар" }]
      : []),
  ];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <MobileNav links={links} />
          <Link href="/" className="truncate font-semibold">
            IBDP Computer Science
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="whitespace-nowrap transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
