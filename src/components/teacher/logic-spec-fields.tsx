"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { expressionTable } from "@/lib/logic/expression";
import { GATE_TYPES, type GateType } from "@/lib/logic/gates";
import {
  emptyTable,
  MAX_GATES,
  MAX_INPUTS,
  MAX_OUTPUTS,
  rowInputs,
  type LogicSpec,
  type TruthTable,
} from "@/lib/logic/spec";
import { GateSymbol } from "@/components/logic/gate-symbol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const NEW_SPEC: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: [...GATE_TYPES],
  max_gates: null,
  table_visible: true,
};

const STALE = "Хүснэгт энэ илэрхийллээр бөглөгдөөгүй байна. «Хүснэгт бөглөх» дарна уу.";

/** "a, b c" → ["A", "B", "C"] */
function parseNames(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((s) => s.toUpperCase());
}

/**
 * Logic-problem settings for the challenge and contest forms. Everything
 * goes to the server as JSON in two hidden fields, and is re-validated there.
 */
export function LogicSpecFields({
  initialSpec,
  initialTable,
}: {
  initialSpec?: LogicSpec;
  initialTable?: TruthTable;
}) {
  const start = initialSpec ?? NEW_SPEC;
  const [inputsText, setInputsText] = useState(start.inputs.join(", "));
  const [outputsText, setOutputsText] = useState(start.outputs.join(", "));
  const [gates, setGates] = useState<GateType[]>(start.allowed_gates);
  const [maxGates, setMaxGates] = useState(start.max_gates === null ? "" : String(start.max_gates));
  const [tableVisible, setTableVisible] = useState(start.table_visible);
  const [table, setTable] = useState<TruthTable>(
    initialTable ?? emptyTable(start.inputs.length, start.outputs.length)
  );
  const [exprs, setExprs] = useState<Record<string, string>>({});
  const [exprErrors, setExprErrors] = useState<Record<string, string>>({});
  /** The expressions the current table was filled from. */
  const [applied, setApplied] = useState<Record<string, string>>({});

  const inputs = parseNames(inputsText);
  const outputs = parseNames(outputsText);
  const sizeOk =
    inputs.length >= 1 && inputs.length <= MAX_INPUTS && outputs.length >= 1 && outputs.length <= MAX_OUTPUTS;
  // A table of the wrong shape (inputs/outputs changed) starts over as zeros.
  const fits = table.length === 2 ** inputs.length && table.every((r) => r.length === outputs.length);
  const current = sizeOk && !fits ? emptyTable(inputs.length, outputs.length) : table;

  const spec = {
    inputs,
    outputs,
    allowed_gates: GATE_TYPES.filter((g) => gates.includes(g)),
    max_gates: maxGates.trim() === "" ? null : Number(maxGates),
    table_visible: tableVisible,
  };

  function toggleGate(g: GateType) {
    setGates((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  }

  function toggleCell(row: number, col: number) {
    setTable(
      current.map((r, i) =>
        i === row ? r.slice(0, col) + (r[col] === "1" ? "0" : "1") + r.slice(col + 1) : r
      )
    );
  }

  function isStale(output: string): boolean {
    const text = exprs[output] ?? "";
    return text.trim() !== "" && text !== (applied[output] ?? "");
  }

  function fillFromExpressions() {
    const result = expressionTable(outputs.map((o) => exprs[o] ?? ""), { inputs, outputs });
    if (result.ok) {
      setTable(result.table);
      setExprErrors({});
      setApplied(exprs);
    } else {
      setExprErrors(Object.fromEntries(result.errors.map((e) => [e.output, e.message])));
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <input type="hidden" name="logic_spec" value={JSON.stringify(spec)} />
      <input type="hidden" name="expected_table" value={JSON.stringify(current)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logic_inputs">Оролтууд</Label>
          <Input id="logic_inputs" value={inputsText} onChange={(e) => setInputsText(e.target.value)} placeholder="A, B, C" />
          <p className="text-xs text-muted-foreground">1–4 ширхэг, тус бүр нэг том латин үсэг.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="logic_outputs">Гаралтууд</Label>
          <Input id="logic_outputs" value={outputsText} onChange={(e) => setOutputsText(e.target.value)} placeholder="Q" />
          <p className="text-xs text-muted-foreground">1–4 ширхэг. Жишээ нь half adder: S, C.</p>
        </div>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Зөвшөөрөгдөх хаалгууд</legend>
        <div className="flex flex-wrap gap-2">
          {GATE_TYPES.map((g) => (
            <label
              key={g}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                gates.includes(g) ? "border-primary bg-primary/5" : "opacity-60"
              )}
            >
              <input type="checkbox" checked={gates.includes(g)} onChange={() => toggleGate(g)} className="size-3.5" />
              <GateSymbol type={g} className="h-5 w-7.5" />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logic_max">Хаалганы дээд тоо</Label>
          <Input
            id="logic_max"
            type="number"
            min={1}
            max={MAX_GATES}
            value={maxGates}
            onChange={(e) => setMaxGates(e.target.value)}
            placeholder="Хязгааргүй"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={tableVisible}
            onChange={(e) => setTableVisible(e.target.checked)}
            className="size-4"
          />
          Үнэний хүснэгтийг сурагчид харуулах
        </label>
      </div>

      {sizeOk ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Хүлээгдэж буй хүснэгт</p>
          <p className="text-xs text-muted-foreground">
            Илэрхийлэл бичээд «Хүснэгт бөглөх» дарна уу, эсвэл гаралтын нүд дээр дарж 0/1 болгож солино уу.
            Жишээ: (A AND B) OR NOT C
          </p>
          {outputs.map((o) => (
            <div key={o} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-10 shrink-0 font-mono text-sm font-semibold">{o} =</span>
                <Input
                  value={exprs[o] ?? ""}
                  onChange={(e) => setExprs((x) => ({ ...x, [o]: e.target.value }))}
                  onKeyDown={(e) => {
                    // Enter fills the table here instead of submitting the whole form.
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fillFromExpressions();
                    }
                  }}
                  // An expression the table was not filled from must not be saved
                  // silently: the browser blocks the submit and shows this.
                  ref={(el) => el?.setCustomValidity(isStale(o) ? STALE : "")}
                  placeholder="A AND B"
                  className="font-mono"
                  aria-label={`${o} гаралтын илэрхийлэл`}
                />
              </div>
              {exprErrors[o] && <p className="pl-12 text-xs text-destructive">{exprErrors[o]}</p>}
              {!exprErrors[o] && isStale(o) && <p className="pl-12 text-xs text-amber-700">{STALE}</p>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={fillFromExpressions}>
            <Wand2 className="size-4" />
            Хүснэгт бөглөх
          </Button>
          <table className="font-mono text-sm">
            <thead>
              <tr>
                {inputs.map((n) => (
                  <th key={n} className="px-2 py-1">{n}</th>
                ))}
                {outputs.map((n, j) => (
                  <th key={n} className={cn("px-2 py-1", j === 0 && "border-l")}>{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {current.map((row, i) => (
                <tr key={i} className="border-t">
                  {rowInputs(inputs.length, i).map((b, j) => (
                    <td key={j} className="px-2 py-0.5 text-center text-muted-foreground">{b}</td>
                  ))}
                  {row.split("").map((b, j) => (
                    <td key={`o${j}`} className={cn("px-1 py-0.5 text-center", j === 0 && "border-l")}>
                      <button
                        type="button"
                        onClick={() => toggleCell(i, j)}
                        className={cn("w-8 rounded font-semibold", b === "1" ? "bg-emerald-600 text-white" : "bg-muted")}
                        aria-label={`${i + 1}-р мөр, ${outputs[j]} = ${b}`}
                      >
                        {b}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-destructive">Оролт 1–4, гаралт 1–4 ширхэг байх ёстой.</p>
      )}
    </div>
  );
}
