import "server-only";

import { and, eq, ne, sql } from "drizzle-orm";
import { getDb, isUniqueViolation } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getFirstModuleId } from "@/lib/db/modules";
import { FIRST_MODULE_ID, SUPER_ADMIN_EMAIL } from "@/lib/constants";
import { UserError } from "@/lib/errors";
import type { UserProfile, UserRole } from "@/lib/types";

const EMAIL_TAKEN =
  "Энэ имэйл хаяг өөр Google бүртгэлтэй холбогдсон байна. Админд хандаж хуучин бүртгэлийг устгуулна уу.";

function toProfile(r: typeof users.$inferSelect): UserProfile {
  return {
    uid: r.uid,
    email: r.email,
    name: r.name,
    photo_url: r.photo_url,
    role: r.role,
    total_xp: r.total_xp,
    unlocked_modules: r.unlocked_modules,
    class_name: r.class_name,
  };
}

/**
 * Creates the user row on first sign-in: 0 XP, student role, only the
 * entry module unlocked. On later sign-ins it only refreshes the mutable
 * Google profile fields — progress columns are never touched.
 */
export async function ensureUserProfile(params: {
  uid: string;
  email: string;
  name: string | null;
  photo_url: string | null;
}): Promise<UserProfile> {
  // The entry module is whichever the teacher ordered first.
  const firstModule = (await getFirstModuleId().catch(() => null)) ?? FIRST_MODULE_ID;

  const isSuperAdmin = params.email === SUPER_ADMIN_EMAIL;

  // A single upsert, so two concurrent first sign-ins cannot both run
  // the "new user" path.
  try {
    const [row] = await getDb()
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        name: params.name,
        photo_url: params.photo_url,
        // Everyone starts as a student; teachers are appointed by the admin.
        role: isSuperAdmin ? "admin" : "student",
        unlocked_modules: [firstModule],
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          name: params.name,
          photo_url: params.photo_url,
          last_login_at: sql`now()`,
          // Self-heals the admin account even if the row predates the role.
          ...(isSuperAdmin ? { role: "admin" as const } : {}),
        },
      })
      .returning();
    return toProfile(row);
  } catch (err) {
    // A recreated Workspace account keeps its address but gets a new
    // Google id — the old row still owns the email.
    if (isUniqueViolation(err, "users_email_unique")) throw new UserError(EMAIL_TAKEN);
    throw err;
  }
}

/**
 * True when the address already belongs to a different Google account
 * (checked at sign-in, so the login page can explain instead of failing).
 */
export async function isEmailTakenByAnotherUser(uid: string, email: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ uid: users.uid })
    .from(users)
    .where(and(eq(users.email, email), ne(users.uid, uid)))
    .limit(1);
  return row !== undefined;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const [row] = await getDb().select().from(users).where(eq(users.uid, uid)).limit(1);
  return row ? toProfile(row) : null;
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await getDb().update(users).set({ role }).where(eq(users.uid, uid));
}

/**
 * Erases the user and — via ON DELETE CASCADE — their submissions,
 * certificates and contest entries.
 */
export async function deleteUserCascade(uid: string): Promise<void> {
  await getDb().delete(users).where(eq(users.uid, uid));
}

/** `className` must already be canonical (parseClassName); null clears it. */
export async function setUserClass(uid: string, className: string | null): Promise<void> {
  await getDb().update(users).set({ class_name: className }).where(eq(users.uid, uid));
}

/** Adds a module to the user's unlocked list; a no-op if already there. */
export async function unlockModule(uid: string, moduleId: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ unlocked_modules: sql`array_append(${users.unlocked_modules}, ${moduleId})` })
    .where(and(eq(users.uid, uid), sql`NOT (${moduleId} = ANY(${users.unlocked_modules}))`));
}
