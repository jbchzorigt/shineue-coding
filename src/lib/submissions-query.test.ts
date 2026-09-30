import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSubmissionsQuery, submissionsHref } from "@/lib/submissions-query";

const known = { studentIds: ["s1", "s2"], problemIds: ["p1"] };

test("known filters and a page number are read", () => {
  assert.deepEqual(parseSubmissionsQuery({ tab: "similar", student: "s2", problem: "p1", page: "3" }, known), {
    tab: "similar",
    student: "s2",
    problem: "p1",
    page: 3,
  });
});

test("junk falls back to all students, all problems, page 1, the attempts tab", () => {
  for (const page of ["-3", "0", "abc", "2.5", "", "1e300", "100000000000000000000", "10001"]) {
    assert.deepEqual(parseSubmissionsQuery({ tab: "x", student: "ghost", problem: "p9", page }, known), {
      tab: "attempts",
      student: undefined,
      problem: undefined,
      page: 1,
    });
  }
  assert.deepEqual(parseSubmissionsQuery({}, known), {
    tab: "attempts",
    student: undefined,
    problem: undefined,
    page: 1,
  });
});

test("the last allowed page is 10000", () => {
  assert.equal(parseSubmissionsQuery({ page: "10000" }, known).page, 10000);
});

test("repeated parameters use the first value", () => {
  assert.equal(parseSubmissionsQuery({ student: ["s1", "s2"] }, known).student, "s1");
});

test("submissionsHref leaves defaults out of the URL", () => {
  const base = "/teacher/contests/cup/submissions";
  assert.equal(submissionsHref(base, { tab: "attempts", page: 1 }), base);
  assert.equal(
    submissionsHref(base, { tab: "similar", student: "s1", problem: "p1", page: 2 }),
    `${base}?tab=similar&student=s1&problem=p1&page=2`
  );
});
