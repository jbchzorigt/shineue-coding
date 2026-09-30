import type { ContestProblem } from "@/lib/db/contests";
import type { SubmissionRow } from "@/lib/db/contest-submissions";
import { formatDateTime } from "@/lib/datetime";
import { parseCircuit } from "@/lib/logic/circuit";
import { circuitFormulas } from "@/lib/logic/formula";
import type { SimilarPair } from "@/lib/plagiarism/pairs";
import { cn } from "@/lib/utils";

const PRE = "max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed";
const EMPTY = "rounded-xl border bg-background p-6 text-center text-sm text-muted-foreground";

/** Python code as written; a circuit as its formulas and gate count. */
export function AnswerView({ problem, code }: { problem: ContestProblem | undefined; code: string }) {
  if (problem?.kind === "logic" && problem.logic_spec) {
    const parsed = parseCircuit(code);
    if (!parsed.ok) {
      return (
        <div className="space-y-1">
          <p className="text-sm text-destructive">Хэлхээг уншиж чадсангүй.</p>
          <pre className={PRE}>{code}</pre>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <pre className={PRE}>{circuitFormulas(parsed.circuit, problem.logic_spec.outputs).join("\n")}</pre>
        <p className="text-xs text-muted-foreground">{parsed.circuit.gates.length} хаалга</p>
      </div>
    );
  }
  return <pre className={PRE}>{code}</pre>;
}

export function SubmissionList({ rows, problems }: { rows: SubmissionRow[]; problems: ContestProblem[] }) {
  if (rows.length === 0) return <p className={EMPTY}>Илгээлт алга.</p>;
  const byId = new Map(problems.map((p) => [p.id, p]));
  return (
    <ul className="divide-y rounded-xl border bg-background">
      {rows.map((r) => {
        const problem = byId.get(r.problem_id);
        return (
          <li key={r.id} className="min-w-0">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-muted/50">
                <span className="font-mono text-xs text-muted-foreground">{formatDateTime(r.submitted_at)}</span>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{r.name ?? r.email}</span>
                  {r.class_name && <span className="ml-1.5 text-muted-foreground">{r.class_name}</span>}
                  {r.name && <span className="ml-2 text-muted-foreground">{r.email}</span>}
                </span>
                <span className="text-muted-foreground">{problem?.title ?? r.problem_id}</span>
                <span className="font-medium tabular-nums">
                  {r.score}/{problem?.points ?? "?"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {r.passed_tests}/{r.total_tests} тест
                </span>
              </summary>
              <div className="px-4 pb-4">
                <AnswerView problem={problem} code={r.code} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

export function SimilarityBadge({ similarity }: { similarity: number }) {
  const percent = Math.round(similarity * 100);
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        percent >= 90
          ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      )}
    >
      {percent}%
    </span>
  );
}

export interface SimilarGroup {
  problem: ContestProblem;
  pairs: SimilarPair[];
  skipped: number;
}

export function SimilarPairs({ groups }: { groups: SimilarGroup[] }) {
  if (groups.length === 0) return <p className={EMPTY}>Бодлого алга.</p>;
  return (
    <div className="space-y-8">
      {groups.map(({ problem, pairs, skipped }) => (
        <section key={problem.id} className="space-y-2">
          <h2 className="font-semibold">{problem.title}</h2>
          <p className="text-xs text-muted-foreground">
            {problem.kind === "logic"
              ? "Хамгийн цөөн хаалгатай зөв хариулт ихэвчлэн ганц байдаг тул өндөр хувь гарах нь хуулбар гэсэн үг биш."
              : "Энгийн бодлогын зөв хариултууд ихэвчлэн төстэй бичигддэг тул өндөр хувь гарах нь хуулбар гэсэн үг биш. Хоёр кодыг харьцуулж шийднэ үү."}
          </p>
          {skipped > 0 && (
            <p className="text-xs text-muted-foreground">
              {skipped} бодолт хэт богино эсвэл уншигдахгүй тул харьцуулаагүй.
            </p>
          )}
          {pairs.length === 0 ? (
            <p className={EMPTY}>Ижил төстэй бодолт олдсонгүй.</p>
          ) : (
            <ul className="divide-y rounded-xl border bg-background">
              {pairs.map((pair) => (
                <li key={`${pair.a.uid}|${pair.b.uid}`} className="min-w-0">
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-muted/50">
                      <SimilarityBadge similarity={pair.similarity} />
                      <span className="font-medium">{pair.a.name}</span>
                      <span className="text-muted-foreground">↔</span>
                      <span className="font-medium">{pair.b.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {pair.a.score} / {pair.b.score} оноо
                      </span>
                    </summary>
                    <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                      {[pair.a, pair.b].map((e) => (
                        <div key={e.uid} className="min-w-0 space-y-1">
                          <p className="text-xs font-medium">{e.name}</p>
                          <AnswerView problem={problem} code={e.answer} />
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
