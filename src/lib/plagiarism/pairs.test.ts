import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_PAIRS, findSimilarPairs, type SimilarEntry } from "@/lib/plagiarism/pairs";

const ORIGINAL = `n = int(input())
total = 0
for i in range(n):
    x = int(input())
    if x % 2 == 0:
        total += x
print(total)
`;
const RENAMED = `count = int(input())
s = 0
for k in range(count):
    v = int(input())  # read
    if v % 2 == 0:
        s += v
print(s)
`;
// One condition changed: about 82% alike.
const TWEAKED = ORIGINAL.replace("if x % 2 == 0:", "if x > 0:");
const UNRELATED = `word = input().strip().lower()
letters = [c for c in word if c.isalpha()]
if letters == letters[::-1]:
    print("YES")
else:
    print("NO")
`;
const circuit = (swap: boolean) =>
  JSON.stringify({
    gates: [
      { id: swap ? "x" : "g1", type: "AND", x: swap ? 300 : 0, y: 0 },
      { id: swap ? "y" : "g2", type: "OR", x: 0, y: swap ? 300 : 0 },
    ],
    wires: [
      { from: swap ? "in:B" : "in:A", to: swap ? "x" : "g1", port: 0 },
      { from: swap ? "in:A" : "in:B", to: swap ? "x" : "g1", port: 1 },
      { from: swap ? "x" : "g1", to: swap ? "y" : "g2", port: 0 },
      { from: "in:C", to: swap ? "y" : "g2", port: 1 },
      { from: swap ? "y" : "g2", to: "out:Q", port: 0 },
    ],
  });
const entry = (uid: string, answer: string, score = 100): SimilarEntry => ({
  uid,
  name: uid,
  score,
  answer,
});
const summary = (pairs: { a: SimilarEntry; b: SimilarEntry; similarity: number }[]) =>
  pairs.map((p) => [p.a.uid, p.b.uid, Math.round(p.similarity * 100)]);

test("python: copies pair up; unrelated and too-short answers do not", () => {
  const { pairs, skipped } = findSimilarPairs("python", [
    entry("a", ORIGINAL),
    entry("b", RENAMED),
    entry("c", UNRELATED),
    entry("d", "print(1)"),
  ]);
  assert.equal(skipped, 1);
  assert.deepEqual(summary(pairs), [["a", "b", 100]]);
});

test("python: most alike first", () => {
  const { pairs } = findSimilarPairs("python", [
    entry("a", ORIGINAL),
    entry("b", RENAMED),
    entry("c", TWEAKED),
  ]);
  assert.deepEqual(summary(pairs), [
    ["a", "b", 100],
    ["a", "c", 82],
    ["b", "c", 82],
  ]);
});

test("python: answers that are only the starter code are skipped", () => {
  const starter = ORIGINAL;
  assert.equal(findSimilarPairs("python", [entry("a", starter), entry("b", starter)]).pairs.length, 1);
  const withStarter = findSimilarPairs("python", [entry("a", starter), entry("b", starter)], {
    starterCode: starter,
  });
  assert.deepEqual(withStarter, { pairs: [], skipped: 2 });
});

test("logic: the same structure pairs at 100%; unreadable and tiny circuits are skipped", () => {
  const tiny = JSON.stringify({ gates: [{ id: "g", type: "NOT", x: 0, y: 0 }], wires: [] });
  const { pairs, skipped } = findSimilarPairs("logic", [
    entry("a", circuit(false)),
    entry("b", circuit(true)),
    entry("c", "{broken"),
    entry("d", tiny),
  ]);
  assert.equal(skipped, 2);
  assert.deepEqual(summary(pairs), [["a", "b", 100]]);
});

test(`at most ${MAX_PAIRS} pairs; nothing in, nothing out`, () => {
  const many = Array.from({ length: 12 }, (_, i) => entry(`s${i}`, ORIGINAL));
  assert.equal(findSimilarPairs("python", many).pairs.length, MAX_PAIRS);
  assert.deepEqual(findSimilarPairs("python", []), { pairs: [], skipped: 0 });
});
