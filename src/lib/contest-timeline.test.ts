import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRacers, raceEnd, scoreTimeline, type ScoreEvent } from "@/lib/contest-timeline";

const START = 1_000_000;
const END = 2_000_000;
const ev = (uid: string, problem_id: string, score: number, at: number): ScoreEvent => ({
  uid,
  problem_id,
  score,
  submitted_at: START + at,
});

test("a participant's line starts at 0 and steps up only when the total improves", () => {
  const lines = scoreTimeline(
    [
      ev("a", "p1", 30, 10),
      ev("a", "p1", 20, 20), // worse retry: no new point
      ev("a", "p2", 50, 30),
      ev("a", "p1", 60, 40), // p1 30 → 60: total 80 → 110
      ev("a", "p2", 50, 50), // same score again: no new point
    ],
    START,
    END
  );
  assert.deepEqual(lines.get("a"), [
    [START, 0],
    [START + 10, 30],
    [START + 30, 80],
    [START + 40, 110],
    [END, 110],
  ]);
});

test("every participant gets their own line", () => {
  const lines = scoreTimeline([ev("a", "p1", 10, 5), ev("b", "p1", 40, 6)], START, END);
  assert.deepEqual([...lines.keys()].sort(), ["a", "b"]);
  assert.deepEqual(lines.get("b"), [
    [START, 0],
    [START + 6, 40],
    [END, 40],
  ]);
});

test("a zero-score attempt alone keeps the line flat at 0", () => {
  assert.deepEqual(scoreTimeline([ev("a", "p1", 0, 5)], START, END).get("a"), [
    [START, 0],
    [END, 0],
  ]);
});

test("the end point is not repeated when the last improvement is at the end", () => {
  assert.deepEqual(scoreTimeline([ev("a", "p1", 10, END - START)], START, END).get("a"), [
    [START, 0],
    [END, 10],
  ]);
});

test("no events, no lines", () => {
  assert.equal(scoreTimeline([], START, END).size, 0);
});

test("pickRacers takes the first ten and adds me when I rank lower", () => {
  const ranked = Array.from({ length: 14 }, (_, i) => `u${i + 1}`);
  assert.deepEqual(pickRacers(ranked, "u3"), ranked.slice(0, 10));
  assert.deepEqual(pickRacers(ranked, "u13"), [...ranked.slice(0, 10), "u13"]);
  assert.deepEqual(pickRacers(ranked, "teacher"), ranked.slice(0, 10));
  assert.deepEqual(pickRacers(["a", "b"], "b", 10), ["a", "b"]);
});

test("raceEnd stops the lines at now while running and at the end afterwards", () => {
  assert.equal(raceEnd(END, END - 5), END - 5);
  assert.equal(raceEnd(END, END + 5), END);
});

test("attempts stored just after the end (graded late) still land on the end edge", () => {
  // Grading takes seconds, so an attempt sent at end−5 s is stored at end+20 s.
  assert.deepEqual(scoreTimeline([ev("a", "p1", 40, 100), ev("a", "p2", 60, END - START + 20_000)], START, END).get("a"), [
    [START, 0],
    [START + 100, 40],
    [END, 100],
  ]);
});

test("attempts from before the start (start moved later) are drawn at the start", () => {
  assert.deepEqual(scoreTimeline([ev("a", "p1", 10, -500)], START, END).get("a"), [
    [START, 0],
    [START, 10],
    [END, 10],
  ]);
});
