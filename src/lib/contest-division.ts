/*
 * A division is an ordinary contest with a grade range ("6–7 анги") or none
 * ("Сонирхогчид" — any grade). Contests of one event share a series name.
 */

export interface DivisionFields {
  series: string | null;
  grade_min: number | null;
  grade_max: number | null;
}

type Range = Pick<DivisionFields, "grade_min" | "grade_max">;

export const RANGE_ERROR = "Ангийн хязгаар 1–12, доод нь дээдээсээ их биш байх ёстой.";

/** The grade a class belongs to: "7A" → 7, "11B" → 11; anything else → null. */
export function gradeOf(className: string | null): number | null {
  const match = /^(\d+)/.exec(className ?? "");
  if (!match) return null;
  const grade = Number(match[1]);
  return grade >= 1 && grade <= 12 ? grade : null;
}

export type Eligibility =
  | { kind: "open" }
  | { kind: "eligible" }
  | { kind: "unknown" }
  | { kind: "ineligible"; grade: number };

/** Whether a student of `className` may enter this contest's division. */
export function divisionEligibility(contest: Range, className: string | null): Eligibility {
  if (contest.grade_min === null || contest.grade_max === null) return { kind: "open" };
  const grade = gradeOf(className);
  if (grade === null) return { kind: "unknown" };
  return grade >= contest.grade_min && grade <= contest.grade_max
    ? { kind: "eligible" }
    : { kind: "ineligible", grade };
}

export function divisionLabel(contest: Range): string {
  if (contest.grade_min === null || contest.grade_max === null) return "Сонирхогчид";
  return contest.grade_min === contest.grade_max
    ? `${contest.grade_min}-р анги`
    : `${contest.grade_min}–${contest.grade_max} анги`;
}

export interface ContestGroup<T> {
  series: string | null;
  contests: T[];
}

/**
 * One card per series (where the series first appears in the newest-first
 * input), divisions ordered by grade with the open one last; a contest
 * without a series is a card of its own.
 */
export function groupContests<T extends DivisionFields>(contests: T[]): ContestGroup<T>[] {
  const groups: ContestGroup<T>[] = [];
  const bySeries = new Map<string, ContestGroup<T>>();
  for (const c of contests) {
    if (!c.series) {
      groups.push({ series: null, contests: [c] });
      continue;
    }
    let group = bySeries.get(c.series);
    if (!group) {
      group = { series: c.series, contests: [] };
      bySeries.set(c.series, group);
      groups.push(group);
    }
    group.contests.push(c);
  }
  const rank = (c: T) => c.grade_min ?? Number.POSITIVE_INFINITY;
  for (const g of bySeries.values()) g.contests.sort((a, b) => rank(a) - rank(b));
  return groups;
}

/** The contest form's series and division fields → stored values, or the error to show. */
export function parseDivisionForm(
  series: string,
  mode: string,
  min: string,
  max: string
): { ok: true; value: DivisionFields } | { ok: false; error: string } {
  const name = series.trim() || null;
  if (mode !== "range") return { ok: true, value: { series: name, grade_min: null, grade_max: null } };
  const lo = /^\d+$/.test(min.trim()) ? Number(min) : NaN;
  const hi = /^\d+$/.test(max.trim()) ? Number(max) : NaN;
  if (!(lo >= 1 && hi <= 12 && lo <= hi)) return { ok: false, error: RANGE_ERROR };
  return { ok: true, value: { series: name, grade_min: lo, grade_max: hi } };
}
