"use client";

import { useRef } from "react";
import type { LiveView, LiveViewRow } from "@/lib/live-board";
import { ClassTag } from "@/components/class-filter";
import { formatClock } from "@/lib/datetime";
import { AnimatedNumber, LiveMedal, LiveTotal, useRowMotion } from "@/components/live/motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Problems = LiveView["problems"];

/** The ranking of one live board; bigger type on wide (hall) screens. */
export function LiveTable({
  rows,
  problems,
  maxTotal,
}: {
  rows: LiveViewRow[];
  problems: Problems;
  maxTotal: number;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <Table className="lg:text-base xl:text-lg">
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">Байр</TableHead>
            <TableHead>Оролцогч</TableHead>
            {problems.map((p, i) => (
              <TableHead key={p.id} className="text-right" title={p.title ?? undefined}>
                Б{i + 1}
                <span className="block text-[10px] font-normal text-muted-foreground">/{p.points}</span>
              </TableHead>
            ))}
            <TableHead className="text-right">
              Нийт
              <span className="block text-[10px] font-normal text-muted-foreground">/{maxTotal}</span>
            </TableHead>
            <TableHead className="text-right">Цаг</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={problems.length + 4} className="py-8 text-center text-muted-foreground">
                Оролцогч бүртгүүлээгүй байна.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <LiveTableRow key={r.key} row={r} problems={problems} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LiveTableRow({ row: r, problems }: { row: LiveViewRow; problems: Problems }) {
  const ref = useRef<HTMLTableRowElement>(null);
  useRowMotion(ref, r.total);
  return (
    <TableRow ref={ref} className={cn(r.mine && "bg-primary/5 hover:bg-primary/10")}>
      <TableCell className="text-lg">
        <LiveMedal rank={r.rank} total={r.total} className={r.rank > 3 ? "pl-1.5" : undefined} />
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
      {problems.map((p) => {
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
            {score === undefined ? "—" : <AnimatedNumber value={score} />}
          </TableCell>
        );
      })}
      <TableCell className="text-right font-bold tabular-nums">
        <LiveTotal value={r.total} />
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
        {r.last_improved_at ? formatClock(r.last_improved_at) : "—"}
      </TableCell>
    </TableRow>
  );
}

/** One line of a division's top list on the «Бүгдийг харах» board. */
export function LiveListRow({ row: r }: { row: LiveViewRow }) {
  const ref = useRef<HTMLLIElement>(null);
  useRowMotion(ref, r.total);
  return (
    <li ref={ref} className="flex items-center justify-between gap-2 py-1.5 lg:text-lg 2xl:py-2.5 2xl:text-2xl">
      <span className="min-w-0 truncate">
        <span className="inline-block w-8">
          <LiveMedal rank={r.rank} total={r.total} />
        </span>
        <span className="font-medium">{r.name}</span>
        <ClassTag value={r.class_name} />
      </span>
      <span className="font-bold tabular-nums">
        <LiveTotal value={r.total} />
      </span>
    </li>
  );
}
