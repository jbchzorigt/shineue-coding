import type { LogicSpec } from "@/lib/logic/spec";

/** The rules of a logic problem, shown beside its prompt. */
export function LogicConstraints({ spec }: { spec: LogicSpec }) {
  return (
    <ul className="mt-4 space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
      <li>
        Оролт: <b className="font-mono">{spec.inputs.join(", ")}</b> · Гаралт:{" "}
        <b className="font-mono">{spec.outputs.join(", ")}</b>
      </li>
      <li>
        Зөвшөөрөгдөх хаалга: <b className="font-mono">{spec.allowed_gates.join(", ")}</b>
      </li>
      {spec.max_gates !== null && (
        <li>
          Хаалганы дээд тоо: <b>{spec.max_gates}</b>
        </li>
      )}
      <li>Хүлээгдэж буй хүснэгт: {spec.table_visible ? "«Ажиллуулах» дарахад харагдана" : "нууц"}</li>
    </ul>
  );
}
