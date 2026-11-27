import { strToU8, zipSync, type Zippable } from "fflate";
import type { ContestProblem } from "@/lib/db/contests";

/** What a downloaded attempt is made from; a SubmissionRow fits. */
export interface FileAttempt {
  uid: string;
  email: string;
  problem_id: string;
  /** 1 for the student's first attempt at this problem. */
  attempt: number;
  score: number;
  /** Python code, or the circuit as JSON. */
  code: string;
}

type ProblemKind = Pick<ContestProblem, "kind">;

/** Latin letters, digits, dot, dash, underscore only, so any OS and zip tool keep the name. */
function safe(part: string): string {
  return part.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+|[._]+$/g, "");
}

/** The email's local part, else the uid, made safe for a file name. */
export function studentStem(email: string, uid: string): string {
  return safe(email.split("@")[0]) || safe(uid) || "student";
}

function extension(problem: ProblemKind | undefined): string {
  if (!problem) return "txt";
  return problem.kind === "logic" ? "json" : "py";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** One attempt on its own, e.g. bat_p1_oroldlogo-3.py. */
export function attemptFileName(row: FileAttempt, problem: ProblemKind | undefined): string {
  const problemPart = safe(row.problem_id) || "bodlogo";
  return `${studentStem(row.email, row.uid)}_${problemPart}_oroldlogo-${row.attempt}.${extension(problem)}`;
}

export function studentZipName(contestId: string, email: string, uid: string): string {
  return `${safe(contestId) || "contest"}_${studentStem(email, uid)}.zip`;
}

/**
 * A student's attempts as a zip: a folder per problem (contest order first),
 * one file per attempt holding exactly what was sent, e.g.
 * 01-p1/oroldlogo-02_100onoo.py.
 */
export function studentZip(
  rows: FileAttempt[],
  problems: Pick<ContestProblem, "id" | "order" | "kind">[]
): Uint8Array<ArrayBuffer> {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const files: Zippable = {};
  for (const row of rows) {
    const problem = byId.get(row.problem_id);
    const folder = problem
      ? `${pad2(problem.order)}-${safe(problem.id) || "bodlogo"}`
      : safe(row.problem_id) || "bodlogo";
    files[`${folder}/oroldlogo-${pad2(row.attempt)}_${row.score}onoo.${extension(problem)}`] =
      strToU8(row.code);
  }
  // zipSync allocates a plain ArrayBuffer; the narrower type lets it be a Response body.
  return zipSync(files) as Uint8Array<ArrayBuffer>;
}
