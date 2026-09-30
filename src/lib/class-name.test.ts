import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CLASS_LENGTH,
  classFromParam,
  classOptions,
  parseClassName,
} from "@/lib/class-name";

const value = (raw: string | null | undefined) => {
  const r = parseClassName(raw);
  assert.ok(r.ok, `expected «${raw}» to be accepted`);
  return r.value;
};

test("one spelling per class: upper case, no spaces or dashes", () => {
  for (const raw of ["11a", " 11 A ", "11-A", "11A"]) assert.equal(value(raw), "11A");
  assert.equal(value("dp1"), "DP1");
});

test("Cyrillic letters that look Latin are folded, so «11А» and «11A» are one class", () => {
  assert.equal(value("11А"), "11A"); // Cyrillic А
  assert.equal(value("12в"), "12B"); // Cyrillic в
  assert.equal(value("10б"), "10Б"); // no Latin look-alike: stays Cyrillic
});

test("blank means no class", () => {
  assert.equal(value(""), null);
  assert.equal(value("   "), null);
  assert.equal(value(null), null);
  assert.equal(value(undefined), null);
});

test(`only letters and digits, at most ${MAX_CLASS_LENGTH}`, () => {
  assert.equal(parseClassName("11A!").ok, false);
  assert.equal(parseClassName("A".repeat(MAX_CLASS_LENGTH + 1)).ok, false);
  assert.equal(value("A".repeat(MAX_CLASS_LENGTH)), "A".repeat(MAX_CLASS_LENGTH));
});

test("classOptions lists each class once, in number order", () => {
  assert.deepEqual(classOptions(["11A", null, "10B", "9A", "10A", "10B"]), ["9A", "10A", "10B", "11A"]);
  assert.deepEqual(classOptions([null, null]), []);
});

test("classFromParam accepts only a listed class, in any spelling", () => {
  const options = ["10A", "11B"];
  assert.equal(classFromParam("10A", options), "10A");
  assert.equal(classFromParam("10а", options), "10A");
  assert.equal(classFromParam(["11B", "10A"], options), "11B");
  assert.equal(classFromParam("12C", options), null);
  assert.equal(classFromParam(undefined, options), null);
});
