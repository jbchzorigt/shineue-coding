import Link from "next/link";
import { auth } from "@/auth";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold">
            IBDP Computer Science
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/modules" className="transition-colors hover:text-foreground">
              Модулиуд
            </Link>
            {session?.user?.role === "teacher" && (
              <Link href="/teacher" className="transition-colors hover:text-foreground">
                Багшийн самбар
              </Link>
            )}
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
