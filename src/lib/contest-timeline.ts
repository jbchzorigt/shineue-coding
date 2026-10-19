/** One graded attempt, as the score chart needs it. */
export interface ScoreEvent {
  uid: string;
  problem_id: string;
  score: number;
  /** epoch ms */
  submitted_at: number;
}

/** [epoch ms, total] — a step line's corners. */
export type ScorePoint = [number, number];

/**
 * Each participant's total over time: 0 at `start`, a new point whenever their
 * best-per-problem sum improves, and a closing point at `end` so the line runs
 * on to the right edge. `events` must be oldest first.
 */
export function scoreTimeline(events: ScoreEvent[], start: number, end: number): Map<string, ScorePoint[]> {
  const best = new Map<string, Map<string, number>>();
  const lines = new Map<string, ScorePoint[]>();

  for (const e of events) {
    let perProblem = best.get(e.uid);
    let line = lines.get(e.uid);
    if (!perProblem || !line) {
      perProblem = new Map();
      line = [[start, 0]];
      best.set(e.uid, perProblem);
      lines.set(e.uid, line);
    }
    const prev = perProblem.get(e.problem_id) ?? 0;
    if (e.score <= prev) continue;
    perProblem.set(e.problem_id, e.score);
    const total = line[line.length - 1][1] + (e.score - prev);
    // Grading runs before the attempt is stored, so a last-second attempt can
    // carry a time just past the end; keep every point inside the window.
    line.push([Math.min(Math.max(e.submitted_at, start), end), total]);
  }

  for (const line of lines.values()) {
    const [lastAt, lastTotal] = line[line.length - 1];
    if (lastAt < end) line.push([end, lastTotal]);
  }
  return lines;
}

/** The ranked uids to draw: the first `n`, plus `me` when I rank below them. */
export function pickRacers(rankedUids: string[], me: string, n = 10): string[] {
  const top = rankedUids.slice(0, n);
  return !top.includes(me) && rankedUids.includes(me) ? [...top, me] : top;
}

/** Where the lines stop: now while the contest runs, its end afterwards. */
export function raceEnd(endsAt: number, now = Date.now()): number {
  return Math.min(now, endsAt);
}
