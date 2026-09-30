import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import type { ChallengeNav, NavItem } from "@/lib/challenge-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** ‹ 3 / 15 › — step through the module's challenges, including skipping ahead. */
export function ChallengeNavArrows({ nav }: { nav: ChallengeNav }) {
  if (nav.index === 0) return null;
  const arrow = "flex size-8 items-center justify-center rounded-md transition-colors";
  const on = "text-foreground hover:bg-muted";
  const off = "pointer-events-none text-muted-foreground/40";
  return (
    <nav aria-label="Дасгалууд" className="flex items-center gap-0.5 text-sm">
      {nav.prev ? (
        <Link href={`/challenges/${nav.prev.id}`} title={nav.prev.title} aria-label="Өмнөх дасгал" className={cn(arrow, on)}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, off)}>
          <ChevronLeft className="size-4" />
        </span>
      )}
      <span className="min-w-12 text-center font-medium tabular-nums text-muted-foreground">
        {nav.index} / {nav.total}
      </span>
      {nav.next ? (
        <Link href={`/challenges/${nav.next.id}`} title={nav.next.title} aria-label="Дараагийн дасгал" className={cn(arrow, on)}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, off)}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

/** Shown once a challenge is solved: on to the next one, or back to the module after the last. */
export function NextChallengeButton({
  next,
  moduleId,
  compact = false,
}: {
  next: NavItem | null;
  moduleId: string;
  /** Short label for tight toolbars; the title moves into the tooltip. */
  compact?: boolean;
}) {
  const size = compact ? "sm" : "default";
  if (next) {
    return (
      <Button render={<Link href={`/challenges/${next.id}`} title={next.title} />} nativeButton={false} size={size}>
        <span className="max-w-64 truncate">{compact ? "Дараагийн" : `Дараагийн дасгал: ${next.title}`}</span>
        <ArrowRight className="size-4" />
      </Button>
    );
  }
  return (
    <Button render={<Link href={`/modules/${moduleId}`} />} nativeButton={false} size={size} variant="outline">
      <PartyPopper className="size-4" />
      {compact ? "Модуль руу" : "Модулийн дасгалууд дууслаа — модуль руу"}
    </Button>
  );
}
