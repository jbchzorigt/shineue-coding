"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  color: "sky" | "amber" | "violet" | "emerald";
}

export const NAV_ICONS = {
  "/modules": BookOpen,
  "/leaderboard": Trophy,
  "/contests": Swords,
  "/teacher": GraduationCap,
} as const;

/** Tailwind needs the full class strings statically. */
const COLORS = {
  sky: {
    idle: "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
    active: "border-sky-600 bg-sky-600 text-white",
  },
  amber: {
    idle: "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
    active: "border-amber-600 bg-amber-600 text-white",
  },
  violet: {
    idle: "border-violet-500/30 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300",
    active: "border-violet-600 bg-violet-600 text-white",
  },
  emerald: {
    idle: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
    active: "border-emerald-600 bg-emerald-600 text-white",
  },
} as const;

export function NavCards({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-2 sm:flex">
      {links.map((l) => {
        const Icon = NAV_ICONS[l.href as keyof typeof NAV_ICONS];
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium whitespace-nowrap shadow-xs transition-colors",
              active ? COLORS[l.color].active : COLORS[l.color].idle
            )}
          >
            {Icon && <Icon className="size-4" />}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
