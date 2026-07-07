import Link from "next/link";
import { LogIn } from "lucide-react";
import { auth } from "@/auth";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b bg-background">
      <div className="relative mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        <Link href="/" className="truncate font-semibold">
          IBDP Computer Science
        </Link>

        {/* Logo placeholder — centered between the title and the profile. */}
        <div
          className="absolute left-1/2 hidden h-9 w-16 -translate-x-1/2 items-center justify-center rounded-md border border-dashed text-[10px] font-medium tracking-widest text-muted-foreground uppercase sm:flex"
          aria-hidden
        >
          Лого
        </div>

        {session?.user ? (
          <UserMenu />
        ) : (
          <Button render={<Link href="/login" />} nativeButton={false} size="sm">
            <LogIn className="size-4" />
            Нэвтрэх
          </Button>
        )}
      </div>
    </header>
  );
}
