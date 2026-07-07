"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Newspaper, Swords, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  color: "sky" | "amber" | "violet" | "emerald" | "rose";
}

export const NAV_ICONS = {
  "/modules": BookOpen,
  "/leaderboard": Trophy,
  "/contests": Swords,
  "/news": Newspaper,
  "/teacher": GraduationCap,
} as const;

/** Tailwind needs the full class strings statically. */
const COLORS = {
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300",
} as const;

/** Colored menu cards shown above the level card on the dashboard. */
export function NavCards({ links }: { links: NavLink[] }) {
  return (
    <nav className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {links.map((l) => {
        const Icon = NAV_ICONS[l.href as keyof typeof NAV_ICONS];
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-center text-sm font-semibold shadow-xs transition-colors",
              COLORS[l.color]
            )}
          >
            {Icon && <Icon className="size-6" />}
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
