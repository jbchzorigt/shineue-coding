import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_USERS_PER_PASTE, parseUserList } from "@/lib/user-list";

test("tab, comma and semicolon separated rows all parse (CRLF too)", () => {
  assert.deepEqual(
    parseUserList("a@shineue.edu.mn\tБат Болд\r\nb@shineue.edu.mn, Сараа\r\nc@shineue.edu.mn;Дорж"),
    {
      ok: true,
      users: [
        { email: "a@shineue.edu.mn", name: "Бат Болд" },
        { email: "b@shineue.edu.mn", name: "Сараа" },
        { email: "c@shineue.edu.mn", name: "Дорж" },
      ],
    }
  );
});

test("emails are trimmed and lower-cased; a missing name falls back to the address", () => {
  assert.deepEqual(parseUserList("  Bat.Bold@Shineue.edu.mn  \n\n   \nsaraa@shineue.edu.mn\t\t10А анги"), {
    ok: true,
    users: [
      { email: "bat.bold@shineue.edu.mn", name: "bat.bold" },
      { email: "saraa@shineue.edu.mn", name: "saraa" },
    ],
  });
});

test("a spreadsheet header row is skipped", () => {
  assert.deepEqual(parseUserList("Имэйл\tНэр\na@shineue.edu.mn\tБат"), {
    ok: true,
    users: [{ email: "a@shineue.edu.mn", name: "Бат" }],
  });
});

test("bad rows are reported with their line numbers and nothing is accepted", () => {
  const r = parseUserList(
    "a@shineue.edu.mn\tБат\nnot-an-email\tX\nb@gmail.com\tY\nA@shineue.edu.mn\tДавхар"
  );
  assert.equal(r.ok, false);
  const errors = r.ok ? [] : r.errors;
  assert.deepEqual(errors.map((e) => e.line), [2, 3, 4]);
  assert.match(errors[0].message, /^2-р мөр: .*имэйл хаяг биш/);
  assert.match(errors[1].message, /^3-р мөр: .*@shineue\.edu\.mn/);
  assert.match(errors[2].message, /^4-р мөр: .*давхардсан/);
});

test("an empty list and an over-long list are refused", () => {
  assert.deepEqual(parseUserList(" \n\n"), {
    ok: false,
    errors: [{ line: 0, message: "Жагсаалт хоосон байна." }],
  });
  const many = Array.from(
    { length: MAX_USERS_PER_PASTE + 1 },
    (_, i) => `u${i}@shineue.edu.mn`
  ).join("\n");
  const r = parseUserList(many);
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.errors[0].message, /200/);
});
