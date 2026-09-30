"use server";

import { redirect } from "next/navigation";
import { CredentialsSignin } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { PASSWORD_PAGE } from "@/auth.config";
import { changePassword, needsPasswordChange } from "@/lib/db/accounts";
import { userMessage } from "@/lib/errors";

export interface FormState {
  error: string | null;
  /** Login only: React resets the form after an action, so echo the email back. */
  email?: string;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return {
        error:
          err.code === "locked"
            ? "Олон удаа буруу оруулсан тул 15 минут түгжигдлээ. Багшдаа хандана уу."
            : "Имэйл эсвэл нууц үг буруу байна.",
        email,
      };
    }
    throw err;
  }
  // Go straight to the right page: if the proxy had to bounce "/" to the
  // password form after a server action, the address bar would keep "/"
  // and that form would then post to the wrong page.
  redirect((await needsPasswordChange(email)) ? PASSWORD_PAGE : "/");
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Нэвтрээгүй байна." };

  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) {
    return { error: "Шинэ нууц үгүүд таарахгүй байна." };
  }
  try {
    await changePassword(session.user.id, current, next);
  } catch (err) {
    return { error: userMessage(err) };
  }
  // The change bumped session_version, which ends this session too — sign
  // straight back in with the new password.
  await signIn("credentials", { email: session.user.email, password: next, redirectTo: "/" });
  return { error: null };
}
