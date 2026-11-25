import "server-only";

import { getContest, listParticipants, listProblems } from "@/lib/db/contests";
import { scoreEvents } from "@/lib/db/contest-submissions";
import type { LiveSnapshot } from "@/lib/live-board";

/**
 * A public contest's board data, uncached (see `live-cache.ts`). Null for an
 * unknown or non-public contest. Emails, statuses and registration times are
 * dropped here so they never sit in the shared cache.
 */
export async function loadLiveSnapshot(contestId: string): Promise<LiveSnapshot | null> {
  const contest = await getContest(contestId);
  if (!contest?.is_public) return null;
  const [problems, participants, events] = await Promise.all([
    listProblems(contestId),
    listParticipants(contestId),
    scoreEvents(contestId),
  ]);
  return {
    contest,
    problems: problems.map((p) => ({ id: p.id, points: p.points, title: p.title })),
    participants: participants.map((p) => ({
      uid: p.uid,
      name: p.name,
      class_name: p.class_name,
      scores: p.scores,
      total: p.total,
      last_improved_at: p.last_improved_at,
    })),
    events,
  };
}
