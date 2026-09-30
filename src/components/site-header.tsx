import Image from "next/image";
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
        {/* The short title keeps phones clear of the centered logo. */}
        <Link href="/" className="truncate font-semibold">
          <span className="sm:hidden">IBDP CS</span>
          <span className="hidden sm:inline">IBDP Computer Science</span>
        </Link>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <Image src="/logo.png" alt="Шинэ Үе сургууль" width={40} height={40} priority />
        </Link>

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
