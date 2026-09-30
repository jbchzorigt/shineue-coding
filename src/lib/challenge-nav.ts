export interface NavItem {
  id: string;
  title: string;
}

export interface ChallengeNav {
  /** 1-based position in the module; 0 when the challenge isn't in the list. */
  index: number;
  total: number;
  prev: NavItem | null;
  next: NavItem | null;
}

/** Where a challenge sits among its module's challenges (already in module order). */
export function challengeNav(siblings: readonly NavItem[], currentId: string): ChallengeNav {
  const i = siblings.findIndex((c) => c.id === currentId);
  if (i === -1) return { index: 0, total: siblings.length, prev: null, next: null };
  return {
    index: i + 1,
    total: siblings.length,
    prev: siblings[i - 1] ?? null,
    next: siblings[i + 1] ?? null,
  };
}
