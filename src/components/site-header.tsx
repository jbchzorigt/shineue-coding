import Link from "next/link";
import { UserMenu } from "@/components/user-menu";

export async function SiteHeader() {
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

        <UserMenu />
      </div>
    </header>
  );
}
