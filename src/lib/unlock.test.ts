import { test } from "node:test";
import assert from "node:assert/strict";
import { computeUnlocked, type ModuleStep } from "@/lib/unlock";

const m = (id: string, order: number, challengeIds: string[] = [`${id}-c1`]): ModuleStep => ({
  id,
  order,
  challengeIds,
});

const COURSE = [m("module-01", 1), m("module-02", 2), m("module-03", 3)];

test("a new student can open only the first module", () => {
  assert.deepEqual(computeUnlocked(COURSE, new Set(), []), ["module-01"]);
});

test("finishing every challenge of a module opens the next one", () => {
  assert.deepEqual(computeUnlocked(COURSE, new Set(["module-01-c1"]), ["module-01"]), [
    "module-01",
    "module-02",
  ]);
  const partly = [m("module-01", 1, ["a", "b"]), m("module-02", 2)];
  assert.deepEqual(computeUnlocked(partly, new Set(["a"]), ["module-01"]), ["module-01"]);
});

test("a module added later opens for students who are already past it", () => {
  // Added after module-02 was completed: the old snapshot never saw it.
  const course = [...COURSE, m("module-04", 4)];
  const passed = new Set(["module-01-c1", "module-02-c1", "module-03-c1"]);
  assert.deepEqual(computeUnlocked(course, passed, ["module-01", "module-02", "module-03"]), [
    "module-01",
    "module-02",
    "module-03",
    "module-04",
  ]);
});

test("modules sharing an order number open together and must all be finished", () => {
  const course = [m("module-01", 1), m("test", 1), m("module-02", 2)];
  assert.deepEqual(computeUnlocked(course, new Set(), ["module-01"]), ["module-01", "test"]);
  assert.deepEqual(computeUnlocked(course, new Set(["module-01-c1"]), ["module-01"]), [
    "module-01",
    "test",
  ]);
  assert.deepEqual(
    computeUnlocked(course, new Set(["module-01-c1", "test-c1"]), ["module-01"]),
    ["module-01", "test", "module-02"]
  );
});

test("a lesson-only module (no challenges) does not block the course", () => {
  const course = [m("module-01", 1), m("reading", 2, []), m("module-03", 3)];
  assert.deepEqual(computeUnlocked(course, new Set(["module-01-c1"]), ["module-01"]), [
    "module-01",
    "reading",
    "module-03",
  ]);
  // …but it only passes students through once they have reached it.
  assert.deepEqual(computeUnlocked(course, new Set(), ["module-01"]), ["module-01"]);
});

test("a module once opened stays open when one is inserted before it", () => {
  const course = [m("module-01", 1), m("module-02", 2), m("module-02b", 2), m("module-03", 3)];
  const passed = new Set(["module-01-c1", "module-02-c1"]);
  assert.deepEqual(computeUnlocked(course, passed, ["module-01", "module-02", "module-03"]), [
    "module-01",
    "module-02",
    "module-02b",
    "module-03",
  ]);
});

test("input order does not matter; deleted modules and an empty course give nothing", () => {
  const shuffled = [COURSE[2], COURSE[0], COURSE[1]];
  assert.deepEqual(computeUnlocked(shuffled, new Set(["module-01-c1"]), ["gone"]), [
    "module-01",
    "module-02",
  ]);
  assert.deepEqual(computeUnlocked([], new Set(), ["module-01"]), []);
});
