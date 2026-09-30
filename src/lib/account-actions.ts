"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUsers, resetPassword, type CreatedUser } from "@/lib/db/accounts";
import { getUserProfile, setUserClass } from "@/lib/db/users";
import { CLASS_ERROR, parseClassName } from "@/lib/class-name";
import { UserError, userMessage } from "@/lib/errors";
import { parseUserList } from "@/lib/user-list";
import { canManageAccount, type UserRole } from "@/lib/types";

/** The caller's role, read from the database — never trust the client. */
async function actorRole(): Promise<UserRole | null> {
  const session = await auth();
  const profile = session?.user?.id ? await getUserProfile(session.user.id) : null;
  return profile?.role ?? null;
}

type NewUserRole = "student" | "teacher";

// React resets the form after every action; the submitted list and role
// come back in the state so the form can show them again.
export type CreateUsersState =
  | { status: "idle" }
  | { status: "error"; errors: string[]; list: string; role: NewUserRole }
  | { status: "done"; created: CreatedUser[]; skipped: string[]; role: NewUserRole };

export async function createUsersAction(
  _prev: CreateUsersState,
  form: FormData
): Promise<CreateUsersState> {
  const role: NewUserRole = form.get("role") === "teacher" ? "teacher" : "student";
  const list = String(form.get("list") ?? "");
  try {
    if (!canManageAccount(await actorRole(), role)) {
      throw new UserError("Танд энэ эрхийн хэрэглэгч нэмэх зөвшөөрөл алга.");
    }
    const parsed = parseUserList(list);
    if (!parsed.ok) {
      return { status: "error", errors: parsed.errors.map((e) => e.message), list, role };
    }

    const result = await createUsers(parsed.users, role);
    revalidatePath("/teacher");
    return { status: "done", ...result, role };
  } catch (err) {
    return { status: "error", errors: [userMessage(err)], list, role };
  }
}

export interface ResetPasswordState {
  tempPassword: string | null;
  error: string | null;
}

export async function resetPasswordAction(uid: string): Promise<ResetPasswordState> {
  try {
    const target = await getUserProfile(uid);
    if (!target) throw new UserError("Хэрэглэгч олдсонгүй.");
    if (!canManageAccount(await actorRole(), target.role)) {
      throw new UserError("Танд энэ хэрэглэгчийн нууц үгийг шинэчлэх эрх алга.");
    }
    const tempPassword = await resetPassword(uid);
    revalidatePath("/teacher");
    return { tempPassword, error: null };
  } catch (err) {
    return { tempPassword: null, error: userMessage(err) };
  }
}

export interface SetClassResult {
  /** The class now stored (canonical spelling), or the old one after an error. */
  value: string | null;
  error: string | null;
}

/** Staff set a student's class from the /teacher table. */
export async function setClassAction(uid: string, raw: string): Promise<SetClassResult> {
  try {
    const target = await getUserProfile(uid);
    if (!target) throw new UserError("Хэрэглэгч олдсонгүй.");
    if (!canManageAccount(await actorRole(), target.role)) {
      throw new UserError("Танд энэ хэрэглэгчийн ангийг засах эрх алга.");
    }
    const parsed = parseClassName(raw);
    if (!parsed.ok) return { value: target.class_name, error: CLASS_ERROR };
    await setUserClass(uid, parsed.value);
    revalidatePath("/teacher");
    revalidatePath("/leaderboard");
    return { value: parsed.value, error: null };
  } catch (err) {
    return { value: null, error: userMessage(err) };
  }
}
