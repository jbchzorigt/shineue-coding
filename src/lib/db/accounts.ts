import "server-only";

import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { getFirstModuleId } from "@/lib/db/modules";
import { users } from "@/lib/db/schema";
import { FIRST_MODULE_ID } from "@/lib/constants";
import { NotFoundError, UserError } from "@/lib/errors";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/passwords";
import { normalizeEmail, type ParsedUser } from "@/lib/user-list";
import type { AuthState } from "@/lib/auth-token";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export interface CreatedUser {
  name: string;
  email: string;
  tempPassword: string;
}

/**
 * Creates accounts for people already validated by parseUserList. Existing
 * emails are skipped, never overwritten. Temporary passwords are returned
 * once and not stored anywhere in plain text.
 */
export async function createUsers(
  people: ParsedUser[],
  role: "student" | "teacher"
): Promise<{ created: CreatedUser[]; skipped: string[] }> {
  const db = getDb();
  const emails = people.map((p) => p.email);
  const existing = emails.length
    ? await db.select({ email: users.email }).from(users).where(inArray(users.email, emails))
    : [];
  const taken = new Set(existing.map((r) => r.email));
  const firstModule = (await getFirstModuleId()) ?? FIRST_MODULE_ID;

  // Hashing is deliberately slow; Node runs these on its thread pool in parallel.
  const prepared = await Promise.all(
    people
      .filter((p) => !taken.has(p.email))
      .map(async (p) => {
        const tempPassword = generateTempPassword();
        return { ...p, tempPassword, hash: await hashPassword(tempPassword) };
      })
  );

  // One statement, so the batch is atomic; a concurrent insert of the same
  // email is skipped instead of failing everything.
  const inserted = prepared.length
    ? await db
        .insert(users)
        .values(
          prepared.map((p) => ({
            uid: newId(),
            email: p.email,
            name: p.name,
            role,
            unlocked_modules: [firstModule],
            password_hash: p.hash,
            must_change_password: true,
          }))
        )
        .onConflictDoNothing({ target: users.email })
        .returning({ email: users.email })
    : [];
  const done = new Set(inserted.map((r) => r.email));

  return {
    created: prepared
      .filter((p) => done.has(p.email))
      .map(({ name, email, tempPassword }) => ({ name, email, tempPassword })),
    skipped: emails.filter((e) => !done.has(e)),
  };
}

export type LoginResult =
  | { ok: true; user: { uid: string; email: string; name: string | null } }
  | { ok: false; reason: "invalid" | "locked" };

let dummyHash: Promise<string> | undefined;

export async function verifyLogin(email: string, password: string): Promise<LoginResult> {
  const db = getDb();
  const [row] = await db
    .select({
      uid: users.uid,
      email: users.email,
      name: users.name,
      password_hash: users.password_hash,
      locked_until: users.locked_until,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  if (row?.locked_until) {
    if (row.locked_until > new Date()) return { ok: false, reason: "locked" };
    // The lock ran out: start counting afresh (only if no newer lock landed).
    await db
      .update(users)
      .set({ failed_logins: 0, locked_until: null })
      .where(and(eq(users.uid, row.uid), lte(users.locked_until, sql`now()`)));
  }

  if (!row?.password_hash) {
    // Same work as a real check, so timing does not reveal which emails exist.
    await verifyPassword(password, await (dummyHash ??= hashPassword("timing-equaliser")));
    return { ok: false, reason: "invalid" };
  }

  if (!(await verifyPassword(password, row.password_hash))) {
    // One atomic statement: concurrent wrong guesses are all counted.
    await db
      .update(users)
      .set({
        failed_logins: sql`${users.failed_logins} + 1`,
        locked_until: sql`case when ${users.failed_logins} + 1 >= ${MAX_FAILED_LOGINS}
          then now() + make_interval(mins => ${LOCK_MINUTES}) end`,
      })
      .where(eq(users.uid, row.uid));
    return { ok: false, reason: "invalid" };
  }

  // Re-check the lock at the moment of success: a burst of parallel guesses
  // all pass the SELECT above, and the lock may have landed meanwhile.
  const signedIn = await db
    .update(users)
    .set({ failed_logins: 0, locked_until: null, last_login_at: sql`now()` })
    .where(
      and(
        eq(users.uid, row.uid),
        or(isNull(users.locked_until), lte(users.locked_until, sql`now()`))
      )
    )
    .returning({ uid: users.uid });
  if (signedIn.length === 0) return { ok: false, reason: "locked" };
  return { ok: true, user: { uid: row.uid, email: row.email, name: row.name } };
}

/** After a successful sign-in: must this user replace a temporary password first? */
export async function needsPasswordChange(email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ must: users.must_change_password })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  return row?.must ?? false;
}

export async function getAuthState(uid: string): Promise<AuthState | null> {
  const [row] = await getDb()
    .select({
      role: users.role,
      must_change_password: users.must_change_password,
      session_version: users.session_version,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  return row ?? null;
}

/** New temporary password; ends every session of the user and unlocks them. */
export async function resetPassword(uid: string): Promise<string> {
  const tempPassword = generateTempPassword();
  const updated = await getDb()
    .update(users)
    .set({
      password_hash: await hashPassword(tempPassword),
      must_change_password: true,
      session_version: sql`${users.session_version} + 1`,
      failed_logins: 0,
      locked_until: null,
    })
    .where(eq(users.uid, uid))
    .returning({ uid: users.uid });
  if (updated.length === 0) throw new NotFoundError("Хэрэглэгч олдсонгүй.");
  return tempPassword;
}

export async function changePassword(
  uid: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new UserError(
      `Шинэ нууц үг ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} тэмдэгт байх ёстой.`
    );
  }
  if (newPassword === currentPassword) {
    throw new UserError("Шинэ нууц үг хуучинтайгаа ижил байж болохгүй.");
  }
  const db = getDb();
  const [row] = await db
    .select({ password_hash: users.password_hash })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  if (!row?.password_hash || !(await verifyPassword(currentPassword, row.password_hash))) {
    throw new UserError("Одоогийн нууц үг буруу байна.");
  }
  await db
    .update(users)
    .set({
      password_hash: await hashPassword(newPassword),
      must_change_password: false,
      // Signs out every other device; the caller signs this one back in.
      session_version: sql`${users.session_version} + 1`,
      failed_logins: 0,
      locked_until: null,
    })
    .where(eq(users.uid, uid));
}

/**
 * Creates the super admin, or — on a rerun — resets its password (the
 * recovery path when it is forgotten). Returns a one-time temporary password.
 */
export async function upsertSuperAdmin(email: string): Promise<string> {
  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  const firstModule = (await getFirstModuleId()) ?? FIRST_MODULE_ID;
  await getDb()
    .insert(users)
    .values({
      uid: newId(),
      email: normalizeEmail(email),
      name: "Админ",
      role: "admin",
      unlocked_modules: [firstModule],
      password_hash: hash,
      must_change_password: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        role: "admin",
        password_hash: hash,
        must_change_password: true,
        session_version: sql`${users.session_version} + 1`,
        failed_logins: 0,
        locked_until: null,
      },
    });
  return tempPassword;
}
