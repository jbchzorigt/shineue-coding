import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  changePassword,
  createUsers,
  getAuthState,
  MAX_FAILED_LOGINS,
  needsPasswordChange,
  resetPassword,
  upsertSuperAdmin,
  verifyLogin,
} from "@/lib/db/accounts";
import { hashPassword } from "@/lib/passwords";
import { NotFoundError, UserError } from "@/lib/errors";

beforeEach(async () => {
  await resetDb();
  await addModule("module-01", 1);
});
after(closeDb);

async function row(uid: string) {
  const [r] = await getDb().select().from(users).where(eq(users.uid, uid));
  return r;
}

async function byEmail(email: string) {
  const [r] = await getDb().select().from(users).where(eq(users.email, email));
  return r;
}

async function addPasswordUser(
  uid: string,
  password: string,
  fields: Partial<typeof users.$inferInsert> = {}
) {
  await addUser(uid, { password_hash: await hashPassword(password), ...fields });
}

test("createUsers creates students who must change their temporary password", async () => {
  const { created, skipped } = await createUsers(
    [
      { email: "a@shineue.edu.mn", name: "А", class_name: "11A" },
      { email: "b@shineue.edu.mn", name: "Б", class_name: null },
    ],
    "student"
  );
  assert.deepEqual(skipped, []);
  assert.deepEqual(created.map((c) => c.email), ["a@shineue.edu.mn", "b@shineue.edu.mn"]);
  const a = await byEmail("a@shineue.edu.mn");
  assert.equal(a.role, "student");
  assert.equal(a.name, "А");
  assert.equal(a.class_name, "11A");
  assert.equal((await byEmail("b@shineue.edu.mn")).class_name, null);
  assert.equal(a.must_change_password, true);
  assert.deepEqual(a.unlocked_modules, ["module-01"]);
  assert.match(a.uid, /^[A-Za-z0-9]{20}$/);
  assert.equal((await verifyLogin("a@shineue.edu.mn", created[0].tempPassword)).ok, true);
});

test("createUsers skips existing emails without touching them, and can create teachers", async () => {
  await addUser("old", { email: "a@shineue.edu.mn", name: "Хуучин" });
  const r = await createUsers(
    [
      { email: "a@shineue.edu.mn", name: "А", class_name: null },
      { email: "t@shineue.edu.mn", name: "Т", class_name: null },
    ],
    "teacher"
  );
  assert.deepEqual(r.skipped, ["a@shineue.edu.mn"]);
  assert.deepEqual(r.created.map((c) => c.email), ["t@shineue.edu.mn"]);
  assert.equal((await row("old")).name, "Хуучин");
  assert.equal((await byEmail("t@shineue.edu.mn")).role, "teacher");
});

test("verifyLogin accepts the right password whatever the email's case or spacing", async () => {
  await addPasswordUser("u1", "correct horse", { failed_logins: 3 });
  assert.deepEqual(await verifyLogin("  U1@Shineue.edu.mn ", "correct horse"), {
    ok: true,
    user: { uid: "u1", email: "u1@shineue.edu.mn", name: "u1" },
  });
  assert.equal((await row("u1")).failed_logins, 0);
});

test("wrong passwords count up; the fifth locks the account even against the right one", async () => {
  await addPasswordUser("u1", "correct horse");
  for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
    assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "wrong"), { ok: false, reason: "invalid" });
  }
  assert.equal((await row("u1")).locked_until, null);
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "wrong"), { ok: false, reason: "invalid" });
  assert.ok((await row("u1")).locked_until! > new Date());
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "correct horse"), {
    ok: false,
    reason: "locked",
  });
});

test("parallel wrong guesses still lock the account", async () => {
  await addPasswordUser("u1", "correct horse");
  await Promise.all(
    Array.from({ length: MAX_FAILED_LOGINS }, () => verifyLogin("u1@shineue.edu.mn", "wrong"))
  );
  const r = await row("u1");
  assert.equal(r.failed_logins, MAX_FAILED_LOGINS);
  assert.ok(r.locked_until! > new Date());
});

test("a correct guess racing a burst of wrong ones cannot slip past the lock", async () => {
  await addPasswordUser("u1", "correct horse");
  const wrong = Array.from({ length: MAX_FAILED_LOGINS * 2 }, () =>
    verifyLogin("u1@shineue.edu.mn", "wrong")
  );
  await new Promise((r) => setTimeout(r, 30));
  const correct = verifyLogin("u1@shineue.edu.mn", "correct horse");
  await Promise.all(wrong);
  assert.deepEqual(await correct, { ok: false, reason: "locked" });
  assert.ok((await row("u1")).locked_until! > new Date());
});

test("an expired lock starts a fresh count", async () => {
  await addPasswordUser("u1", "correct horse", {
    failed_logins: MAX_FAILED_LOGINS,
    locked_until: new Date(Date.now() - 1000),
  });
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "wrong"), { ok: false, reason: "invalid" });
  const r = await row("u1");
  assert.equal(r.failed_logins, 1);
  assert.equal(r.locked_until, null);
  assert.equal((await verifyLogin("u1@shineue.edu.mn", "correct horse")).ok, true);
});

test("unknown emails and accounts without a password are rejected alike", async () => {
  await addUser("g1");
  assert.deepEqual(await verifyLogin("nobody@shineue.edu.mn", "x"), { ok: false, reason: "invalid" });
  assert.deepEqual(await verifyLogin("g1@shineue.edu.mn", "x"), { ok: false, reason: "invalid" });
});

test("resetPassword issues a working temporary password, ends sessions and unlocks", async () => {
  await addPasswordUser("u1", "old password", {
    failed_logins: MAX_FAILED_LOGINS,
    locked_until: new Date(Date.now() + 60_000),
    session_version: 2,
  });
  const temp = await resetPassword("u1");
  assert.match(temp, /^[a-km-np-z2-9]{5}-[a-km-np-z2-9]{5}$/);
  const r = await row("u1");
  assert.equal(r.session_version, 3);
  assert.equal(r.must_change_password, true);
  assert.equal(r.failed_logins, 0);
  assert.equal(r.locked_until, null);
  assert.equal((await verifyLogin("u1@shineue.edu.mn", temp)).ok, true);
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "old password"), {
    ok: false,
    reason: "invalid",
  });
  await assert.rejects(resetPassword("nobody"), (err) => err instanceof NotFoundError);
});

test("changePassword validates, then clears the must-change flag and ends other sessions", async () => {
  await addPasswordUser("u1", "temp-pass1", { must_change_password: true });
  await assert.rejects(
    changePassword("u1", "wrong", "new password 1"),
    (err) => err instanceof UserError && /Одоогийн нууц үг буруу/.test(err.message)
  );
  await assert.rejects(
    changePassword("u1", "temp-pass1", "short"),
    (err) => err instanceof UserError && /8–128/.test(err.message)
  );
  await assert.rejects(
    changePassword("u1", "temp-pass1", "temp-pass1"),
    (err) => err instanceof UserError && /хуучинтайгаа ижил/.test(err.message)
  );
  await changePassword("u1", "temp-pass1", "new password 1");
  const r = await row("u1");
  assert.equal(r.must_change_password, false);
  assert.equal(r.session_version, 1);
  assert.equal((await verifyLogin("u1@shineue.edu.mn", "new password 1")).ok, true);
});

test("needsPasswordChange tells the login where to send the user", async () => {
  await addUser("u1", { must_change_password: true });
  await addUser("u2");
  assert.equal(await needsPasswordChange(" U1@Shineue.edu.mn"), true);
  assert.equal(await needsPasswordChange("u2@shineue.edu.mn"), false);
  assert.equal(await needsPasswordChange("nobody@shineue.edu.mn"), false);
});

test("getAuthState returns what the session check needs", async () => {
  await addUser("u1", { role: "teacher", must_change_password: true, session_version: 4 });
  assert.deepEqual(await getAuthState("u1"), {
    role: "teacher",
    must_change_password: true,
    session_version: 4,
  });
  assert.equal(await getAuthState("nobody"), null);
});

test("upsertSuperAdmin creates the admin, and a rerun resets its password on the same account", async () => {
  const first = await upsertSuperAdmin("Boss@Shineue.edu.mn");
  const a = await byEmail("boss@shineue.edu.mn");
  assert.equal(a.role, "admin");
  assert.equal(a.must_change_password, true);
  assert.equal((await verifyLogin("boss@shineue.edu.mn", first)).ok, true);

  const second = await upsertSuperAdmin("boss@shineue.edu.mn");
  const b = await byEmail("boss@shineue.edu.mn");
  assert.equal(b.uid, a.uid);
  assert.equal(b.session_version, a.session_version + 1);
  assert.deepEqual(await verifyLogin("boss@shineue.edu.mn", first), { ok: false, reason: "invalid" });
  assert.equal((await verifyLogin("boss@shineue.edu.mn", second)).ok, true);
});
