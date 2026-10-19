import type { ContestRequest, ParticipantStatus } from "@/lib/db/contests";

/** Why a student may not see or submit problems yet; null when they may. */
export function entryBlock(participant: { status: ParticipantStatus } | null): string | null {
  if (!participant) return "Эхлээд тэмцээнд бүртгүүлнэ үү.";
  if (participant.status === "pending") return "Багш таны хүсэлтийг зөвшөөрөөгүй байна.";
  if (participant.status === "rejected") return "Таны хүсэлтийг татгалзсан.";
  return null;
}

/**
 * The pending requests a bulk button covers: "all", or "class:<name>" for one
 * class. Rejected requests are only ever approved one by one.
 */
export function requestUidsInScope(requests: ContestRequest[], scope: string): string[] {
  const pending = requests.filter((r) => r.status === "pending");
  if (scope === "all") return pending.map((r) => r.uid);
  if (scope.startsWith("class:")) {
    const name = scope.slice("class:".length);
    if (!name) return [];
    return pending.filter((r) => r.class_name === name).map((r) => r.uid);
  }
  return [];
}

/** Classes with pending requests, for the «<анги> (k) зөвшөөрөх» buttons. */
export function pendingClasses(requests: ContestRequest[]): { className: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of requests) {
    if (r.status === "pending" && r.class_name) {
      counts.set(r.class_name, (counts.get(r.class_name) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([className, count]) => ({ className, count }))
    .sort((a, b) => a.className.localeCompare(b.className, "mn"));
}
