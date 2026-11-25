export type ContestStatus = "upcoming" | "running" | "finished";

/** Pure (no server-only), so client components can use it too. */
export function contestStatus(c: { starts_at: number; ends_at: number }, now = Date.now()): ContestStatus {
  if (now < c.starts_at) return "upcoming";
  if (now <= c.ends_at) return "running";
  return "finished";
}
