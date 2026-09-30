import { toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/datetime";
import { parseCircuit } from "@/lib/logic/circuit";
import { circuitFormulas } from "@/lib/logic/formula";
import type { ContestProblem, Participant } from "@/lib/db/contests";
import type { SubmissionRow } from "@/lib/db/contest-submissions";

/** Python code as written; a circuit as one formula line per output. */
export function answerText(problem: ContestProblem | undefined, code: string): string {
  if (problem?.kind !== "logic" || !problem.logic_spec) return code;
  const parsed = parseCircuit(code);
  return parsed.ok ? circuitFormulas(parsed.circuit, problem.logic_spec.outputs).join("\n") : code;
}

/** «Дүн»: leaderboard order, best score per problem. */
export function resultsCsv(problems: ContestProblem[], participants: Participant[]): string {
  const header = ["Байр", "Нэр", "Анги", "Имэйл", ...problems.map((p) => p.title), "Нийт"];
  const rows = participants.map((p, i) => [
    i + 1,
    p.name ?? p.email,
    p.class_name ?? "",
    p.email,
    ...problems.map((problem) => p.scores[problem.id] ?? 0),
    p.total,
  ]);
  return toCsv([header, ...rows]);
}

/** «Бүх оролдлого»: every attempt, as given (oldest first). */
export function attemptsCsv(problems: ContestProblem[], rows: SubmissionRow[]): string {
  const byId = new Map(problems.map((p) => [p.id, p]));
  const header = ["Цаг", "Нэр", "Анги", "Имэйл", "Бодлого", "Төрөл", "Оноо", "Дээд оноо", "Давсан тест", "Нийт тест", "Хариулт"];
  return toCsv([
    header,
    ...rows.map((r) => {
      const problem = byId.get(r.problem_id);
      return [
        formatDateTime(r.submitted_at),
        r.name ?? r.email,
        r.class_name ?? "",
        r.email,
        problem?.title ?? r.problem_id,
        problem?.kind === "logic" ? "Хэлхээ" : "Python",
        r.score,
        problem?.points ?? "",
        r.passed_tests,
        r.total_tests,
        answerText(problem, r.code),
      ];
    }),
  ]);
}
