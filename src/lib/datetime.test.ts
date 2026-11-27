import { test } from "node:test";
import assert from "node:assert/strict";
import { formatClock, formatDateTime } from "@/lib/datetime";

test("formatDateTime shows Ulaanbaatar time as YYYY-MM-DD HH:mm:ss", () => {
  assert.equal(formatDateTime(Date.parse("2026-03-01T09:05:07Z")), "2026-03-01 17:05:07");
});

test("formatDateTime moves past midnight into the next day", () => {
  assert.equal(formatDateTime(Date.parse("2026-03-01T20:00:00Z")), "2026-03-02 04:00:00");
});

test("formatClock: school time of day, 24-hour, the same on server and browser", () => {
  assert.equal(formatClock(Date.parse("2026-11-28T01:02:03Z")), "09:02:03");
  assert.equal(formatClock(Date.parse("2026-11-28T13:05:09Z")), "21:05:09");
});
