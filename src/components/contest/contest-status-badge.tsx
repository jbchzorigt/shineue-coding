import { cn } from "@/lib/utils";
import type { ContestStatus } from "@/lib/firebase/contests";

const LABEL: Record<ContestStatus, string> = {
  upcoming: "Удахгүй",
  running: "Явагдаж байна",
  finished: "Дууссан",
};

export function ContestStatusBadge({ status }: { status: ContestStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "upcoming" && "bg-sky-500/15 text-sky-700",
        status === "running" && "bg-emerald-500/15 text-emerald-700",
        status === "finished" && "bg-muted text-muted-foreground"
      )}
    >
      {LABEL[status]}
    </span>
  );
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatWindow(startsAt: number, endsAt: number): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleString("mn-MN", {
      timeZone: "Asia/Ulaanbaatar",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  return `${fmt(startsAt)} — ${fmt(endsAt)}`;
}
