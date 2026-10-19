import { test } from "node:test";
import assert from "node:assert/strict";
import { entryBlock, pendingClasses, requestUidsInScope } from "@/lib/contest-access";
import type { ContestRequest } from "@/lib/db/contests";

test("entryBlock explains why a student cannot take part", () => {
  assert.equal(entryBlock(null), "Эхлээд тэмцээнд бүртгүүлнэ үү.");
  assert.equal(entryBlock({ status: "pending" }), "Багш таны хүсэлтийг зөвшөөрөөгүй байна.");
  assert.equal(entryBlock({ status: "rejected" }), "Таны хүсэлтийг татгалзсан.");
  assert.equal(entryBlock({ status: "approved" }), null);
});

const request = (
  uid: string,
  class_name: string | null,
  status: ContestRequest["status"]
): ContestRequest => ({ uid, name: uid, email: `${uid}@x`, class_name, status, requested_at: 0 });

const requests = [
  request("a", "10А", "pending"),
  request("b", "10А", "rejected"),
  request("c", "10Б", "pending"),
  request("d", null, "pending"),
];

test("a scope selects pending requests only", () => {
  assert.deepEqual(requestUidsInScope(requests, "all"), ["a", "c", "d"]);
  assert.deepEqual(requestUidsInScope(requests, "class:10А"), ["a"]);
  assert.deepEqual(requestUidsInScope(requests, "class:"), []);
  assert.deepEqual(requestUidsInScope(requests, "bogus"), []);
});

test("pendingClasses counts pending requests per named class", () => {
  assert.deepEqual(pendingClasses(requests), [
    { className: "10А", count: 1 },
    { className: "10Б", count: 1 },
  ]);
});
