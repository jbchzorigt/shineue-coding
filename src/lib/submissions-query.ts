export type SubmissionsTab = "attempts" | "similar";

export interface SubmissionsQuery {
  tab: SubmissionsTab;
  student?: string;
  problem?: string;
  page: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

/** A million attempts; a larger OFFSET would overflow Postgres. */
const MAX_PAGE = 10_000;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Page searchParams → a query; unknown students/problems and junk pages fall back to "all" / 1. */
export function parseSubmissionsQuery(
  sp: SearchParams,
  known: { studentIds: readonly string[]; problemIds: readonly string[] }
): SubmissionsQuery {
  const student = first(sp.student);
  const problem = first(sp.problem);
  const page = Number(first(sp.page));
  return {
    tab: first(sp.tab) === "similar" ? "similar" : "attempts",
    student: student && known.studentIds.includes(student) ? student : undefined,
    problem: problem && known.problemIds.includes(problem) ? problem : undefined,
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
  };
}

/** Link to the submissions page; defaults are left out. */
export function submissionsHref(base: string, q: SubmissionsQuery): string {
  const params = new URLSearchParams();
  if (q.tab !== "attempts") params.set("tab", q.tab);
  if (q.student) params.set("student", q.student);
  if (q.problem) params.set("problem", q.problem);
  if (q.page > 1) params.set("page", String(q.page));
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
