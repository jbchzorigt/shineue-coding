import { test } from "node:test";
import assert from "node:assert/strict";
import type { Bit } from "@/lib/logic/gates";
import { expressionTable, parseExpression } from "@/lib/logic/expression";
import { rowInputs } from "@/lib/logic/spec";

const ABC = ["A", "B", "C"];

/** Table of one expression over A, B, C. */
function tableOf(expr: string): string[] {
  const r = expressionTable([expr], { inputs: ABC, outputs: ["Q"] });
  if (!r.ok) throw new Error(r.errors[0].message);
  return r.table;
}

/** The same table from a JS function. */
function truth(fn: (a: Bit, b: Bit, c: Bit) => boolean | number): string[] {
  return Array.from({ length: 8 }, (_, i) => {
    const [a, b, c] = rowInputs(3, i);
    return fn(a, b, c) ? "1" : "0";
  });
}

function message(src: string, inputs = ["A", "B"]): string {
  const r = parseExpression(src, inputs);
  return r.ok ? "" : r.message;
}

test("NOT binds tightest, then AND, then XOR, then OR", () => {
  assert.deepEqual(tableOf("A OR B AND C"), truth((a, b, c) => a | (b & c)));
  assert.deepEqual(tableOf("NOT A AND B"), truth((a, b) => (a ^ 1) & b));
  assert.deepEqual(tableOf("A XOR B OR C"), truth((a, b, c) => (a ^ b) | c));
  assert.deepEqual(tableOf("A AND B XOR C"), truth((a, b, c) => (a & b) ^ c));
  assert.deepEqual(tableOf("A NOR B NAND C"), truth((a, b, c) => (a | ((b & c) ^ 1)) ^ 1));
});

test("chains are left-associative and parentheses override", () => {
  assert.deepEqual(tableOf("A NAND B NAND C"), truth((a, b, c) => (((a & b) ^ 1) & c) ^ 1));
  assert.deepEqual(tableOf("(A OR B) AND C"), truth((a, b, c) => (a | b) & c));
  assert.deepEqual(tableOf("NOT NOT A"), truth((a) => a));
  assert.deepEqual(tableOf("A XNOR B"), truth((a, b) => a === b));
});

test("keywords and names are case-insensitive", () => {
  assert.deepEqual(tableOf("a and not b"), truth((a, b) => a & (b ^ 1)));
});

test("errors say what and where", () => {
  assert.equal(message(""), "Илэрхийлэл хоосон байна.");
  assert.equal(message("(A AND B"), "1-р тэмдэгтэд нээсэн хаалт хаагдаагүй байна.");
  assert.equal(message("A AND"), "Илэрхийлэл дутуу байна.");
  assert.equal(message("A B"), "3-р тэмдэгтэд «B» байх ёсгүй.");
  assert.equal(message("A )"), "3-р тэмдэгтэд «)» байх ёсгүй.");
  assert.equal(message("AND A"), "1-р тэмдэгтэд «AND» байх ёсгүй.");
  assert.equal(message("A AND D"), "«D» гэсэн оролт алга.");
  assert.equal(message("A & B"), "3-р тэмдэгт «&» танигдсангүй.");
  assert.equal(message("A ANDD B"), "3-р тэмдэгтэд «ANDD» гэсэн үг танигдсангүй.");
});

test("expressionTable fills several outputs and reports each broken one", () => {
  assert.deepEqual(expressionTable(["A XOR B", "A AND B"], { inputs: ["A", "B"], outputs: ["S", "C"] }), {
    ok: true,
    table: ["00", "10", "10", "01"],
  });
  assert.deepEqual(expressionTable(["A OR", ""], { inputs: ["A", "B"], outputs: ["S", "C"] }), {
    ok: false,
    errors: [
      { output: "S", message: "Илэрхийлэл дутуу байна." },
      { output: "C", message: "Илэрхийлэл хоосон байна." },
    ],
  });
});
