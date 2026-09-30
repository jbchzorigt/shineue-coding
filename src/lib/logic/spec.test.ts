import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyTable,
  parseLogicSpec,
  parseLogicSpecJson,
  rowInputs,
  type LogicSpec,
} from "@/lib/logic/spec";

const valid: LogicSpec = {
  inputs: ["A", "B"],
  outputs: ["Q"],
  allowed_gates: ["AND", "OR"],
  max_gates: 3,
  table_visible: true,
};
const table = ["0", "0", "0", "1"];

function errs(patch: Record<string, unknown>): string[] {
  const r = parseLogicSpec({ ...valid, ...patch }, table);
  return r.ok ? [] : r.errors;
}

test("rowInputs counts up in binary with the first input as the high bit", () => {
  assert.deepEqual(rowInputs(2, 1), [0, 1]);
  assert.deepEqual(rowInputs(3, 6), [1, 1, 0]);
  assert.deepEqual(rowInputs(1, 0), [0]);
});

test("emptyTable has 2^n rows of zeros", () => {
  assert.deepEqual(emptyTable(2, 2), ["00", "00", "00", "00"]);
  assert.deepEqual(emptyTable(1, 1), ["0", "0"]);
});

test("parseLogicSpec accepts a valid spec and returns a clean copy", () => {
  const got = parseLogicSpec(
    { ...valid, allowed_gates: ["OR", "AND"], extra: "x", table_visible: "yes" },
    table
  );
  assert.deepEqual(got, {
    ok: true,
    spec: { ...valid, allowed_gates: ["AND", "OR"], table_visible: false },
    table,
  });
});

test("parseLogicSpec rejects bad names and counts", () => {
  const NAMES = "Оролт, гаралтын нэр бүр нэг том латин үсэг байх ёстой (A–Z).";
  assert.deepEqual(errs({ inputs: ["a", "B"] }), [NAMES]);
  assert.deepEqual(errs({ inputs: ["AB"] }), [NAMES]);
  assert.deepEqual(errs({ outputs: ["A"] }), ["Оролт, гаралтын нэрс давхцаж болохгүй."]);
  assert.deepEqual(errs({ inputs: [] }), ["Оролт 1–4 ширхэг байх ёстой."]);
  assert.deepEqual(errs({ inputs: ["A", "B", "C", "D", "E"] }), ["Оролт 1–4 ширхэг байх ёстой."]);
  assert.deepEqual(errs({ outputs: [] }), ["Гаралт 1–4 ширхэг байх ёстой."]);
});

test("parseLogicSpec rejects bad gate lists and limits", () => {
  assert.deepEqual(errs({ allowed_gates: [] }), ["Дор хаяж нэг хаалга зөвшөөрөгдсөн байх ёстой."]);
  assert.deepEqual(errs({ allowed_gates: ["AND", "BUF"] }), ["Хаалганы жагсаалт буруу байна."]);
  assert.deepEqual(errs({ allowed_gates: ["AND", "AND"] }), ["Хаалганы жагсаалт буруу байна."]);
  for (const max_gates of [0, 61, 2.5, "3"]) {
    assert.deepEqual(errs({ max_gates }), ["Хаалганы дээд тоо 1–60 хооронд байх ёстой."], String(max_gates));
  }
  assert.equal(parseLogicSpec({ ...valid, max_gates: null }, table).ok, true);
  assert.equal(parseLogicSpec({ ...valid, max_gates: 60 }, table).ok, true);
});

test("parseLogicSpec checks the table against the inputs and outputs", () => {
  const rows = { ok: false, errors: ["Үнэний хүснэгт 4 мөртэй байх ёстой."] };
  const width = { ok: false, errors: ["Хүснэгтийн мөр бүр 1 ширхэг 0/1 тэмдэгт байх ёстой."] };
  assert.deepEqual(parseLogicSpec(valid, ["0", "1"]), rows);
  assert.deepEqual(parseLogicSpec(valid, "0001"), rows);
  assert.deepEqual(parseLogicSpec(valid, ["0", "1", "1", "10"]), width);
  assert.deepEqual(parseLogicSpec(valid, ["0", "1", "1", "2"]), width);
});

test("parseLogicSpecJson treats broken JSON as missing", () => {
  assert.equal(parseLogicSpecJson(JSON.stringify(valid), JSON.stringify(table)).ok, true);
  assert.equal(parseLogicSpecJson("{oops", "[]").ok, false);
});
