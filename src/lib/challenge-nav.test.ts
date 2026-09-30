import { test } from "node:test";
import assert from "node:assert/strict";
import { challengeNav } from "@/lib/challenge-nav";

const list = [
  { id: "c1", title: "Нэг" },
  { id: "c2", title: "Хоёр" },
  { id: "c3", title: "Гурав" },
];

test("a middle challenge has both neighbours and its position", () => {
  assert.deepEqual(challengeNav(list, "c2"), {
    index: 2,
    total: 3,
    prev: { id: "c1", title: "Нэг" },
    next: { id: "c3", title: "Гурав" },
  });
});

test("the first has no previous, the last has no next", () => {
  assert.equal(challengeNav(list, "c1").prev, null);
  assert.deepEqual(challengeNav(list, "c1").next, { id: "c2", title: "Хоёр" });
  assert.equal(challengeNav(list, "c3").next, null);
  assert.equal(challengeNav(list, "c3").index, 3);
});

test("a lone challenge, or one missing from the list, has no neighbours", () => {
  assert.deepEqual(challengeNav([list[0]], "c1"), { index: 1, total: 1, prev: null, next: null });
  assert.deepEqual(challengeNav(list, "gone"), { index: 0, total: 3, prev: null, next: null });
});
