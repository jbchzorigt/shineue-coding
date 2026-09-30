import { applyGate, GATE_TYPES, gateArity, type Bit, type GateType } from "@/lib/logic/gates";
import { GateSymbol } from "@/components/logic/gate-symbol";

const RULE: Record<GateType, string> = {
  AND: "Хоёр оролт хоёулаа 1 үед л 1.",
  OR: "Дор хаяж нэг оролт 1 бол 1.",
  NOT: "Оролтын эсрэг утга.",
  NAND: "AND-ийн эсрэг: хоёулаа 1 үед л 0.",
  NOR: "OR-ийн эсрэг: хоёулаа 0 үед л 1.",
  XOR: "Оролтууд ялгаатай үед 1.",
  XNOR: "Оролтууд ижил үед 1.",
};

const ONE: Bit[][] = [[0], [1]];
const TWO: Bit[][] = [[0, 0], [0, 1], [1, 0], [1, 1]];

/** Lesson reference: every gate's symbol, rule and truth table. */
export function GateTable() {
  return (
    <div className="not-prose my-4 grid gap-3 sm:grid-cols-2">
      {GATE_TYPES.map((type) => {
        const rows = gateArity(type) === 1 ? ONE : TWO;
        const names = gateArity(type) === 1 ? ["A"] : ["A", "B"];
        return (
          <div key={type} className="flex gap-4 rounded-lg border bg-background p-3">
            <div className="flex flex-col items-center gap-1">
              <GateSymbol type={type} className="h-12 w-18" />
              <span className="font-mono text-sm font-semibold">{type}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm">{RULE[type]}</p>
              <table className="font-mono text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    {names.map((n) => (
                      <th key={n} className="px-1.5">{n}</th>
                    ))}
                    <th className="border-l px-1.5">Q</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.join("")}>
                      {r.map((b, i) => (
                        <td key={i} className="px-1.5 text-center">{b}</td>
                      ))}
                      <td className="border-l px-1.5 text-center font-semibold">
                        {applyGate(type, r[0], r[1] ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
