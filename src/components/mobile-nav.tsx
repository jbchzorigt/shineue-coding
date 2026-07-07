"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NAV_ICONS, type NavLink } from "@/components/nav-cards";
import { cn } from "@/lib/utils";

const TEXT_COLORS = {
  sky: "text-sky-700 dark:text-sky-300",
  amber: "text-amber-700 dark:text-amber-300",
  violet: "text-violet-700 dark:text-violet-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
} as const;

export function MobileNav({ links }: { links: NavLink[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="sm:hidden" aria-label="Цэс" />}
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {links.map((l) => {
          const Icon = NAV_ICONS[l.href as keyof typeof NAV_ICONS];
          return (
            <DropdownMenuItem
              key={l.href}
              render={<Link href={l.href} />}
              className={cn("font-medium", TEXT_COLORS[l.color])}
            >
              {Icon && <Icon className="size-4" />}
              {l.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
