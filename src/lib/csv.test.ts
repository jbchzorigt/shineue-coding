import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "@/lib/csv";

test("toCsv quotes every text cell and doubles inner quotes", () => {
  assert.equal(toCsv([["Нэр", "Оноо"], ['Бат "Б"', 90]]), '"Нэр","Оноо"\r\n"Бат ""Б""",90\r\n');
});

test("toCsv keeps line breaks inside a quoted cell", () => {
  assert.equal(toCsv([["a\nb", 1]]), '"a\nb",1\r\n');
});

test("toCsv defuses text that Excel would run as a formula", () => {
  assert.equal(
    toCsv([["=1+1", "+x", "-y", "@z", "\tq", "ok"]]),
    `"'=1+1","'+x","'-y","'@z","'\tq","ok"\r\n`
  );
  assert.equal(toCsv([[-5]]), "-5\r\n");
});

test("toCsv of no rows is empty", () => {
  assert.equal(toCsv([]), "");
});
