/**
 * Public live boards: who may see what, and in which shape. Pure (no
 * server-only) so the client countdown can import it; `contests.ts` is
 * imported for types only.
 */
import type { Contest } from "@/lib/db/contests";
import type { RaceSeries } from "@/components/contest/score-race-chart";
import { contestStatus, type ContestStatus } from "@/lib/contest-status";
import { groupContests, type ContestGroup } from "@/lib/contest-division";
import { pickRacers, raceEnd, scoreTimeline, type ScoreEvent } from "@/lib/contest-timeline";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** A public contest shows on the home page this long before it starts… */
export const UPCOMING_WINDOW_MS = 14 * DAY_MS;
/** …and its results this long after it ends. */
export const FINISHED_WINDOW_MS = 3 * DAY_MS;

const NO_NAME = "Оролцогч";

/** «Бат Болд» → «Бат Б.»: the first word whole, the rest as initials. */
export function publicName(name: string | null): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return NO_NAME;
  const [first, ...rest] = words;
  return [first, ...rest.map((w) => `${Array.from(w)[0]}.`)].join(" ");
}

/** «2 өдөр 4 цаг» from a day up, «01:24:37» below; never negative. */
export function formatDuration(ms: number): string {
  if (ms >= DAY_MS) {
    return `${Math.floor(ms / DAY_MS)} өдөр ${Math.floor((ms % DAY_MS) / HOUR_MS)} цаг`;
  }
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export interface HomeBoard {
  running: ContestGroup<Contest>[];
  upcoming: ContestGroup<Contest> | null;
  finished: ContestGroup<Contest> | null;
}

/** Divisions of one event start within a day of each other; a reused series name a year on does not. */
const SAME_EVENT_MS = DAY_MS;

/**
 * The public contests of `anchor`'s event (same series, starting within a day
 * of it) that pass `keep` — or just `anchor` — divisions in grade order.
 */
function groupOf(
  publicContests: Contest[],
  anchor: Contest,
  keep: (c: Contest) => boolean = () => true
): ContestGroup<Contest> {
  const members = anchor.series
    ? publicContests.filter(
        (c) =>
          c.series === anchor.series && Math.abs(c.starts_at - anchor.starts_at) <= SAME_EVENT_MS && keep(c)
      )
    : [anchor];
  return groupContests(members)[0];
}

/**
 * What the home page's «Тэмцээн» section shows: every running public contest;
 * with none running, the next one within two weeks and the latest results
 * from the last three days.
 */
export function homeBoard(contests: Contest[], now = Date.now()): HomeBoard {
  const pub = contests.filter((c) => c.is_public);
  const running = pub.filter((c) => contestStatus(c, now) === "running");
  if (running.length > 0) return { running: groupContests(running), upcoming: null, finished: null };

  const isUpcoming = (c: Contest) => contestStatus(c, now) === "upcoming";
  const isFinished = (c: Contest) => contestStatus(c, now) === "finished";
  const next = pub
    .filter((c) => isUpcoming(c) && c.starts_at - now <= UPCOMING_WINDOW_MS)
    .sort((a, b) => a.starts_at - b.starts_at)[0];
  const last = pub
    .filter((c) => isFinished(c) && now - c.ends_at <= FINISHED_WINDOW_MS)
    .sort((a, b) => b.ends_at - a.ends_at)[0];
  // A series whose divisions run at different times splits across the cards.
  return {
    running: [],
    upcoming: next ? groupOf(pub, next, isUpcoming) : null,
    finished: last ? groupOf(pub, last, isFinished) : null,
  };
}

/** The public divisions shown beside `anchorId`; null when it is unknown or not public. */
export function seriesMembers(contests: Contest[], anchorId: string): Contest[] | null {
  const anchor = contests.find((c) => c.id === anchorId);
  if (!anchor?.is_public) return null;
  return groupOf(
    contests.filter((c) => c.is_public),
    anchor
  ).contests;
}

/** One ranked participant as cached on the server — never sent to a browser as is. */
export interface LiveRow {
  uid: string;
  name: string | null;
  class_name: string | null;
  scores: Record<string, number>;
  total: number;
  last_improved_at: number | null;
}

/** Everything a live board needs, cached per contest (server only). */
export interface LiveSnapshot {
  contest: Contest;
  problems: { id: string; points: number; title: string }[];
  participants: LiveRow[];
  events: ScoreEvent[];
}

export interface LiveViewRow {
  rank: number;
  name: string;
  class_name: string | null;
  scores: Record<string, number>;
  total: number;
  last_improved_at: number | null;
  mine: boolean;
}

/** What reaches the page: no uids, no emails, short names for visitors. */
export interface LiveView {
  status: ContestStatus;
  /** `id` is the problem's position ("0", "1", …); rows' `scores` use the same keys. */
  problems: { id: string; points: number; title: string | null }[];
  rows: LiveViewRow[];
  race: RaceSeries[];
  maxTotal: number;
  chartEnd: number;
}

/** Shapes a snapshot for one viewer: `uid: null` is a visitor without an account. */
export function liveView(snap: LiveSnapshot, viewer: { uid: string | null }, now = Date.now()): LiveView {
  const { contest } = snap;
  const status = contestStatus(contest, now);
  const signedIn = viewer.uid !== null;
  const shown = (name: string | null) => (signedIn ? name?.trim() || NO_NAME : publicName(name));

  const chartEnd = raceEnd(contest.ends_at, now);
  const lines = scoreTimeline(snap.events, contest.starts_at, chartEnd);
  const byUid = new Map(snap.participants.map((p) => [p.uid, p]));
  const racers = pickRacers(
    snap.participants.map((p) => p.uid).filter((uid) => lines.has(uid)),
    viewer.uid ?? ""
  );

  // Problems go out under their position, not the teacher's id: an id like
  // «fibonacci» would give a problem away before the start.
  const positional = (scores: Record<string, number>) => {
    const out: Record<string, number> = {};
    snap.problems.forEach((p, i) => {
      if (p.id in scores) out[String(i)] = scores[p.id];
    });
    return out;
  };

  return {
    status,
    problems: snap.problems.map((p, i) => ({
      id: String(i),
      points: p.points,
      title: status === "upcoming" ? null : p.title,
    })),
    rows: snap.participants.map((p, i) => ({
      rank: i + 1,
      name: shown(p.name),
      class_name: p.class_name,
      scores: positional(p.scores),
      total: p.total,
      last_improved_at: p.last_improved_at,
      mine: p.uid === viewer.uid,
    })),
    race: racers.map((uid) => ({
      name: shown(byUid.get(uid)?.name ?? null),
      data: lines.get(uid)!,
      mine: uid === viewer.uid,
    })),
    maxTotal: snap.problems.reduce((s, p) => s + p.points, 0),
    chartEnd,
  };
}
