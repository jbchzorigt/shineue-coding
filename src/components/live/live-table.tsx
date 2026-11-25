import type { LiveView } from "@/lib/live-board";
import { ClassTag } from "@/components/class-filter";
import { formatTime } from "@/components/contest/contest-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

/** The ranking of one live board; bigger type on wide (hall) screens. */
export function LiveTable({ view }: { view: LiveView }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <Table className="lg:text-base xl:text-lg">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Байр</TableHead>
            <TableHead>Оролцогч</TableHead>
            {view.problems.map((p, i) => (
              <TableHead key={p.id} className="text-right" title={p.title ?? undefined}>
                Б{i + 1}
                <span className="block text-[10px] font-normal text-muted-foreground">/{p.points}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">
              Нийт
              <span className="block text-[10px] font-normal text-muted-foreground">/{view.maxTotal}</span>
            </TableHead>
            <TableHead className="text-right">Цаг</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={view.problems.length + 4} className="py-8 text-center text-muted-foreground">
                Оролцогч бүртгүүлээгүй байна.
              </TableCell>
            </TableRow>
          )}
          {view.rows.map((r) => (
            <TableRow key={r.rank} className={cn(r.mine && "bg-primary/5 hover:bg-primary/10")}>
              <TableCell className="text-lg">
                {MEDALS[r.rank - 1] ?? <span className="pl-1.5 text-sm text-muted-foreground">{r.rank}</span>}
              </TableCell>
              <TableCell>
                <span className="font-medium">{r.name}</span>
                <ClassTag value={r.class_name} />
                {r.mine && (
                  <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                    Та
                  </span>
                )}
              </TableCell>
              {view.problems.map((p) => {
                const score = r.scores[p.id];
                return (
                  <TableCell
                    key={p.id}
                    className={cn(
                      "text-right tabular-nums",
                      score === p.points && "font-semibold text-emerald-600",
                      score === undefined && "text-muted-foreground"
                    )}
                  >
                    {score ?? "—"}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-bold tabular-nums">{r.total}</TableCell>
              <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                {r.last_improved_at ? formatTime(r.last_improved_at) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
