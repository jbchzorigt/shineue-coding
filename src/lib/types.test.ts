import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageAccount, type UserRole } from "@/lib/types";

test("teachers manage students; the admin manages students and teachers; nobody manages the admin", () => {
  const cases: [UserRole | null, UserRole, boolean][] = [
    ["student", "student", false],
    ["student", "teacher", false],
    ["student", "admin", false],
    ["teacher", "student", true],
    ["teacher", "teacher", false],
    ["teacher", "admin", false],
    ["admin", "student", true],
    ["admin", "teacher", true],
    ["admin", "admin", false],
    [null, "student", false],
  ];
  for (const [actor, target, expected] of cases) {
    assert.equal(canManageAccount(actor, target), expected, `${actor} → ${target}`);
  }
});
