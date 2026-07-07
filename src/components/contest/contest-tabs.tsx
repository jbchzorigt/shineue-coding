import Link from "next/link";
import { cn } from "@/lib/utils";

export function ContestTabs({
  contestId,
  active,
}: {
  contestId: string;
  active: "problems" | "leaderboard";
}) {
  const tabs = [
    { key: "problems", label: "Бодлого", href: `/contests/${contestId}` },
    { key: "leaderboard", label: "Leaderboard", href: `/contests/${contestId}/leaderboard` },
  ] as const;

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={cn(
            "flex-1 rounded-md px-4 py-1.5 text-center text-sm font-medium transition-colors",
            active === t.key
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
