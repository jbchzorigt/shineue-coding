import type { GateType } from "@/lib/logic/gates";
import { cn } from "@/lib/utils";

/*
 * IB (ANSI distinctive-shape) symbols on a 60×40 grid: inputs enter at
 * y=12 and y=28 (NOT: y=20), the output leaves at y=20. No hooks, so it
 * renders in lessons (server) and in the editor (client).
 */
const AND_BODY = "M10 4 H28 A16 16 0 0 1 28 36 H10 Z";
const OR_BODY = "M8 4 Q22 4 34 11 Q41 15 44 20 Q41 25 34 29 Q22 36 8 36 Q16 20 8 4 Z";
const XOR_BODY = "M12 4 Q26 4 36 11 Q42 15 45 20 Q42 25 36 29 Q26 36 12 36 Q20 20 12 4 Z";
const XOR_BACK = "M6 4 Q14 20 6 36";
const NOT_BODY = "M12 6 L40 20 L12 34 Z";

interface Shape {
  body: string;
  extra?: string;
  /** x where the body ends at y=20. */
  tip: number;
  bubble?: boolean;
  /** x where the input stubs meet the body. */
  inputEnd: number;
}

const SHAPES: Record<GateType, Shape> = {
  AND: { body: AND_BODY, tip: 44, inputEnd: 10 },
  NAND: { body: AND_BODY, tip: 44, bubble: true, inputEnd: 10 },
  OR: { body: OR_BODY, tip: 44, inputEnd: 11 },
  NOR: { body: OR_BODY, tip: 44, bubble: true, inputEnd: 11 },
  XOR: { body: XOR_BODY, extra: XOR_BACK, tip: 45, inputEnd: 9 },
  XNOR: { body: XOR_BODY, extra: XOR_BACK, tip: 45, bubble: true, inputEnd: 9 },
  NOT: { body: NOT_BODY, tip: 40, bubble: true, inputEnd: 12 },
};

export function GateSymbol({ type, className }: { type: GateType; className?: string }) {
  const s = SHAPES[type];
  const ys = type === "NOT" ? [20] : [12, 28];
  const outStart = s.bubble ? s.tip + 7 : s.tip;
  return (
    <svg
      viewBox="0 0 60 40"
      className={cn("h-10 w-15", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
      role="img"
      aria-label={`${type} хаалга`}
    >
      {ys.map((y) => (
        <line key={y} x1={0} y1={y} x2={s.inputEnd} y2={y} />
      ))}
      <path d={s.body} className="fill-background" />
      {s.extra && <path d={s.extra} />}
      {s.bubble && <circle cx={s.tip + 3.5} cy={20} r={3.5} className="fill-background" />}
      <line x1={outStart} y1={20} x2={60} y2={20} />
    </svg>
  );
}
