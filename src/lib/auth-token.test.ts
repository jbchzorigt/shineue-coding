import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshToken } from "@/lib/auth-token";

const token = { sub: "u1", sv: 2, role: "student" as const, mustChangePassword: false, name: "Бат" };

test("a session ends when the account is gone", () => {
  assert.equal(refreshToken(token, null), null);
});

test("a session ends when the password was changed or reset since sign-in", () => {
  assert.equal(
    refreshToken(token, { role: "student", must_change_password: false, session_version: 3 }),
    null
  );
});

test("a current session picks up role and the must-change flag from the database", () => {
  assert.deepEqual(
    refreshToken(token, { role: "teacher", must_change_password: true, session_version: 2 }),
    { ...token, role: "teacher", mustChangePassword: true }
  );
});

test("tokens issued before session versions existed count as version 0", () => {
  const legacy = { sub: "u1", role: "student" as const };
  assert.deepEqual(
    refreshToken(legacy, { role: "student", must_change_password: false, session_version: 0 }),
    { ...legacy, role: "student", mustChangePassword: false }
  );
  assert.equal(
    refreshToken(legacy, { role: "student", must_change_password: false, session_version: 1 }),
    null
  );
});
