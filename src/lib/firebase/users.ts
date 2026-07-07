import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { getFirstModuleId } from "@/lib/firebase/modules";
import { FIRST_MODULE_ID, SUPER_ADMIN_EMAIL } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

const USERS = "users";

/**
 * Creates the user document on first sign-in: 0 XP, student role,
 * only Module 1 unlocked. On later sign-ins it only refreshes the
 * mutable Google profile fields — progress fields are never touched.
 */
export async function ensureUserProfile(params: {
  uid: string;
  email: string;
  name: string | null;
  photo_url: string | null;
}): Promise<UserProfile> {
  const ref = getDb().collection(USERS).doc(params.uid);

  // The entry module is whichever the teacher ordered first.
  const firstModule = (await getFirstModuleId().catch(() => null)) ?? FIRST_MODULE_ID;

  const isSuperAdmin = params.email === SUPER_ADMIN_EMAIL;

  const newProfile: UserProfile = {
    uid: params.uid,
    email: params.email,
    name: params.name,
    photo_url: params.photo_url,
    // Everyone starts as a student; teachers are appointed by the admin.
    role: isSuperAdmin ? "admin" : "student",
    total_xp: 0,
    unlocked_modules: [firstModule],
  };

  try {
    // create() fails if the doc exists, so two concurrent first
    // sign-ins cannot both run the "new user" path.
    await ref.create({
      ...newProfile,
      created_at: FieldValue.serverTimestamp(),
      last_login_at: FieldValue.serverTimestamp(),
    });
    return newProfile;
  } catch (err) {
    if ((err as { code?: number }).code !== 6 /* ALREADY_EXISTS */) throw err;
  }

  await ref.set(
    {
      name: params.name,
      photo_url: params.photo_url,
      // Self-heals the admin account even if the doc predates the role.
      ...(isSuperAdmin ? { role: "admin" } : {}),
      last_login_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const snap = await ref.get();
  return snap.data() as UserProfile;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDb().collection(USERS).doc(uid).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}
