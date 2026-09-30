import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDateTime } from "@/lib/datetime";

test("formatDateTime shows Ulaanbaatar time as YYYY-MM-DD HH:mm:ss", () => {
  assert.equal(formatDateTime(Date.parse("2026-03-01T09:05:07Z")), "2026-03-01 17:05:07");
});

test("formatDateTime moves past midnight into the next day", () => {
  assert.equal(formatDateTime(Date.parse("2026-03-01T20:00:00Z")), "2026-03-02 04:00:00");
});
