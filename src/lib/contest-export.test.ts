import { test } from "node:test";
import assert from "node:assert/strict";
import { answerText, attemptsCsv, resultsCsv } from "@/lib/contest-export";
import type { ContestProblem, Participant } from "@/lib/db/contests";
import type { SubmissionRow } from "@/lib/db/contest-submissions";

const PY: ContestProblem = {
  id: "p1",
  title: "Нийлбэр",
  prompt: "",
  order: 1,
  points: 100,
  kind: "python",
  public_test_cases: [],
};
const LOGIC: ContestProblem = {
  id: "p2",
  title: "Хэлхээ",
  prompt: "",
  order: 2,
  points: 50,
  kind: "logic",
  public_test_cases: [],
  logic_spec: { inputs: ["A", "B"], outputs: ["Q"], allowed_gates: ["AND"], max_gates: null, table_visible: false },
};
const CIRCUIT = JSON.stringify({
  gates: [{ id: "g1", type: "AND", x: 0, y: 0 }],
  wires: [
    { from: "in:A", to: "g1", port: 0 },
    { from: "in:B", to: "g1", port: 1 },
    { from: "g1", to: "out:Q", port: 0 },
  ],
});
const person = (
  uid: string,
  name: string | null,
  class_name: string | null,
  scores: Record<string, number>,
  total: number
): Participant => ({
  uid,
  name,
  email: `${uid}@x`,
  class_name,
  scores,
  total,
  last_improved_at: null,
});

test("results: one row per participant in leaderboard order; missing scores are 0; no name → email", () => {
  const csv = resultsCsv(
    [PY, LOGIC],
    [person("s1", "Бат", "11A", { p1: 100, p2: 50 }, 150), person("s2", null, null, { p1: 40 }, 40)]
  );
  assert.equal(
    csv,
    '"Байр","Нэр","Анги","Имэйл","Нийлбэр","Хэлхээ","Нийт"\r\n' +
      '1,"Бат","11A","s1@x",100,50,150\r\n' +
      '2,"s2@x","","s2@x",40,0,40\r\n'
  );
});

test("results with no participants is just the header", () => {
  assert.equal(resultsCsv([PY], []), '"Байр","Нэр","Анги","Имэйл","Нийлбэр","Нийт"\r\n');
});

test("attempts: school time, kind, and the answer as code or formulas", () => {
  const rows: SubmissionRow[] = [
    { id: 1, uid: "s1", name: "Бат", email: "s1@x", class_name: "11A", problem_id: "p1", code: "print(1)", score: 100, passed_tests: 2, total_tests: 2, submitted_at: Date.parse("2026-03-01T01:02:03Z") },
    { id: 2, uid: "s2", name: null, email: "s2@x", class_name: null, problem_id: "p2", code: CIRCUIT, score: 50, passed_tests: 4, total_tests: 4, submitted_at: Date.parse("2026-03-01T01:05:00Z") },
  ];
  assert.equal(
    attemptsCsv([PY, LOGIC], rows),
    '"Цаг","Нэр","Анги","Имэйл","Бодлого","Төрөл","Оноо","Дээд оноо","Давсан тест","Нийт тест","Хариулт"\r\n' +
      '"2026-03-01 09:02:03","Бат","11A","s1@x","Нийлбэр","Python",100,100,2,2,"print(1)"\r\n' +
      '"2026-03-01 09:05:00","s2@x","","s2@x","Хэлхээ","Хэлхээ",50,50,4,4,"Q = A AND B"\r\n'
  );
});

test("answerText keeps the stored text when a circuit can't be read or the problem is gone", () => {
  assert.equal(answerText(LOGIC, "{broken"), "{broken");
  assert.equal(answerText(undefined, "x = 1"), "x = 1");
  assert.equal(answerText(LOGIC, CIRCUIT), "Q = A AND B");
});
