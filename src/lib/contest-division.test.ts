import { test } from "node:test";
import assert from "node:assert/strict";
import {
  divisionEligibility,
  divisionLabel,
  gradeOf,
  groupContests,
  parseDivisionForm,
  type DivisionFields,
} from "@/lib/contest-division";

const RANGE_ERROR = "Ангийн хязгаар 1–12, доод нь дээдээсээ их биш байх ёстой.";

test("gradeOf reads the leading grade of a class name", () => {
  assert.equal(gradeOf("7A"), 7);
  assert.equal(gradeOf("11B"), 11);
  assert.equal(gradeOf("6"), 6);
  assert.equal(gradeOf("A7"), null);
  assert.equal(gradeOf("13A"), null);
  assert.equal(gradeOf("0A"), null);
  assert.equal(gradeOf(null), null);
});

test("divisionEligibility: open, in range, out of range, unknown", () => {
  const open = { grade_min: null, grade_max: null };
  const juniors = { grade_min: 6, grade_max: 7 };
  assert.deepEqual(divisionEligibility(open, "7A"), { kind: "open" });
  assert.deepEqual(divisionEligibility(open, null), { kind: "open" });
  assert.deepEqual(divisionEligibility(juniors, "7A"), { kind: "eligible" });
  assert.deepEqual(divisionEligibility(juniors, "11B"), { kind: "ineligible", grade: 11 });
  assert.deepEqual(divisionEligibility(juniors, null), { kind: "unknown" });
  assert.deepEqual(divisionEligibility(juniors, "A7"), { kind: "unknown" });
});

test("divisionLabel names a division from its range", () => {
  assert.equal(divisionLabel({ grade_min: 6, grade_max: 7 }), "6–7 анги");
  assert.equal(divisionLabel({ grade_min: 9, grade_max: 9 }), "9-р анги");
  assert.equal(divisionLabel({ grade_min: null, grade_max: null }), "Сонирхогчид");
});

test("groupContests puts a series together, juniors first, open last", () => {
  const c = (id: string, series: string | null, min: number | null, max: number | null) =>
    ({ id, series, grade_min: min, grade_max: max }) satisfies DivisionFields & { id: string };
  const x = c("x", "S", 11, 12);
  const y = c("y", null, null, null);
  const z = c("z", "S", null, null);
  const w = c("w", "S", 6, 7);
  assert.deepEqual(groupContests([x, y, z, w]), [
    { series: "S", contests: [w, x, z] },
    { series: null, contests: [y] },
  ]);
});

test("parseDivisionForm accepts open and valid ranges, refuses the rest", () => {
  assert.deepEqual(parseDivisionForm("  Намар ", "range", "6", "7"), {
    ok: true,
    value: { series: "Намар", grade_min: 6, grade_max: 7 },
  });
  assert.deepEqual(parseDivisionForm("", "open", "", ""), {
    ok: true,
    value: { series: null, grade_min: null, grade_max: null },
  });
  for (const [min, max] of [["8", "6"], ["0", "3"], ["5", "13"], ["", "7"], ["6.5", "7"]]) {
    assert.deepEqual(parseDivisionForm("x", "range", min, max), { ok: false, error: RANGE_ERROR }, `${min}-${max}`);
  }
});
