import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import {
  certificates,
  contestParticipants,
  contests,
  contestSubmissions,
  submissions,
} from "@/lib/db/schema";
import {
  deleteUserCascade,
  ensureUserProfile,
  getUserProfile,
  isEmailTakenByAnotherUser,
  unlockModule,
  updateUserRole,
} from "@/lib/db/users";
import { UserError } from "@/lib/errors";
import { FIRST_MODULE_ID, SUPER_ADMIN_EMAIL } from "@/lib/constants";

beforeEach(resetDb);
after(closeDb);

const student = { uid: "u1", email: "u1@shineue.edu.mn", name: "Бат", photo_url: null };

test("first sign-in creates a student with 0 XP and the first module unlocked", async () => {
  await addModule("module-02", 2);
  await addModule("module-01", 1);
  assert.deepEqual(await ensureUserProfile(student), {
    ...student,
    role: "student",
    total_xp: 0,
    unlocked_modules: ["module-01"],
  });
});

test("first sign-in falls back to FIRST_MODULE_ID when no modules exist", async () => {
  const p = await ensureUserProfile(student);
  assert.deepEqual(p.unlocked_modules, [FIRST_MODULE_ID]);
});

test("later sign-ins refresh name/photo but never progress or role", async () => {
  await addUser("u1", {
    name: "Хуучин",
    total_xp: 120,
    unlocked_modules: ["module-01", "module-02"],
    role: "teacher",
  });
  const p = await ensureUserProfile({ ...student, name: "Шинэ", photo_url: "https://x/y.png" });
  assert.deepEqual(p, {
    uid: "u1",
    email: "u1@shineue.edu.mn",
    name: "Шинэ",
    photo_url: "https://x/y.png",
    role: "teacher",
    total_xp: 120,
    unlocked_modules: ["module-01", "module-02"],
  });
});

test("the super admin is admin on first sign-in and self-heals later", async () => {
  const admin = { uid: "adm", email: SUPER_ADMIN_EMAIL, name: "Админ", photo_url: null };
  assert.equal((await ensureUserProfile(admin)).role, "admin");
  await updateUserRole("adm", "student");
  assert.equal((await ensureUserProfile(admin)).role, "admin");
});

test("an email already linked to another Google account is detected and blocked", async () => {
  await addUser("old-sub", { email: "u1@shineue.edu.mn" });
  assert.equal(await isEmailTakenByAnotherUser("new-sub", "u1@shineue.edu.mn"), true);
  assert.equal(await isEmailTakenByAnotherUser("old-sub", "u1@shineue.edu.mn"), false);
  assert.equal(await isEmailTakenByAnotherUser("new-sub", "free@shineue.edu.mn"), false);
  await assert.rejects(
    ensureUserProfile({ ...student, uid: "new-sub" }),
    (err) => err instanceof UserError && /Админд хандаж/.test(err.message)
  );
});

test("getUserProfile returns null for unknown users", async () => {
  assert.equal(await getUserProfile("nobody"), null);
});

test("updateUserRole changes the role", async () => {
  await addUser("u1");
  await updateUserRole("u1", "teacher");
  assert.equal((await getUserProfile("u1"))?.role, "teacher");
});

test("unlockModule appends once", async () => {
  await addUser("u1", { unlocked_modules: ["module-01"] });
  await unlockModule("u1", "module-02");
  await unlockModule("u1", "module-02");
  assert.deepEqual((await getUserProfile("u1"))?.unlocked_modules, ["module-01", "module-02"]);
});

test("deleteUserCascade removes the user and all their data", async () => {
  const db = getDb();
  await addModule("module-01", 1);
  await addChallenge("ch-1", "module-01");
  await addUser("u1");
  await addUser("u2");
  await db.insert(submissions).values({ uid: "u1", challenge_id: "ch-1", passed: true });
  await db.insert(certificates).values({ id: "cert1", uid: "u1", name: "Бат", syllabus: "s" });
  await db.insert(contests).values({
    id: "cup",
    title: "Cup",
    starts_at: new Date("2026-01-01T00:00:00Z"),
    ends_at: new Date("2026-01-02T00:00:00Z"),
  });
  await db.insert(contestParticipants).values({ contest_id: "cup", uid: "u1", email: "u1@x" });
  await db.insert(contestSubmissions).values({
    contest_id: "cup",
    uid: "u1",
    problem_id: "p1",
    code: "",
    score: 0,
    passed_tests: 0,
    total_tests: 1,
  });

  await deleteUserCascade("u1");

  assert.equal(await getUserProfile("u1"), null);
  assert.ok(await getUserProfile("u2"));
  assert.equal((await db.select().from(submissions)).length, 0);
  assert.equal((await db.select().from(certificates)).length, 0);
  assert.equal((await db.select().from(contestParticipants)).length, 0);
  assert.equal((await db.select().from(contestSubmissions)).length, 0);
});
