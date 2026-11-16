"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contest } from "@/lib/db/contests";

/** «Цуврал» and «Ангилал» inputs of the contest form. */
export function DivisionFields({ contest, seriesOptions }: { contest: Contest | null; seriesOptions: string[] }) {
  const [ranged, setRanged] = useState(contest?.grade_min != null);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="series">Цуврал</Label>
        <Input
          id="series"
          name="series"
          list="series-options"
          defaultValue={contest?.series ?? ""}
          placeholder="Намрын тэмцээн 2026"
        />
        <datalist id="series-options">
          {seriesOptions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Ангилал</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="division_mode"
            value="open"
            checked={!ranged}
            onChange={() => setRanged(false)}
            className="accent-primary"
          />
          Бүх анги (сонирхогчид)
        </label>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="radio"
            name="division_mode"
            value="range"
            checked={ranged}
            onChange={() => setRanged(true)}
            className="accent-primary"
          />
          Ангиас
          <Input
            name="grade_min"
            type="number"
            min={1}
            max={12}
            defaultValue={contest?.grade_min ?? ""}
            disabled={!ranged}
            className="h-8 w-16"
            aria-label="Доод анги"
          />
          хүртэл
          <Input
            name="grade_max"
            type="number"
            min={1}
            max={12}
            defaultValue={contest?.grade_max ?? ""}
            disabled={!ranged}
            className="h-8 w-16"
            aria-label="Дээд анги"
          />
        </label>
      </fieldset>
    </div>
  );
}
