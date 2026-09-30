import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { isStaff } from "@/lib/types";
import { Button } from "@/components/ui/button";

/**
 * A shortcut into the management pages, shown only to teachers and the
 * admin. The session role is refreshed from the database on every request;
 * the actions behind the link re-check it anyway.
 */
export async function StaffLink({ href, children }: { href: string; children: ReactNode }) {
  const session = await auth();
  if (!isStaff(session?.user?.role)) return null;
  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant="outline"
      size="sm"
      className="shrink-0"
    >
      {children}
    </Button>
  );
}
