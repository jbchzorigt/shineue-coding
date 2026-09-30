"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { deleteUserCascade, getUserProfile, updateUserRole } from "@/lib/db/users";
import { upsertModule, deleteModule as deleteModuleDoc } from "@/lib/db/modules";
import {
  upsertChallenge,
  deleteChallenge as deleteChallengeDoc,
} from "@/lib/db/challenges";
import { UserError, userMessage } from "@/lib/errors";
import { parseLogicSpecJson } from "@/lib/logic/spec";
import { mdxError, normalizeMdx } from "@/lib/mdx-check";
import { isStaff, type Challenge, type ChallengePrivate, type ChallengeType, type PublicTestCase } from "@/lib/types";

export interface ActionState {
  error: string | null;
}

/** Every action re-checks the database role — never trust the client. */
async function requireTeacher(): Promise<void> {
  const session = await auth();
  const profile = session?.user?.id
    ? await getUserProfile(session.user.id)
    : null;
  if (!isStaff(profile?.role)) {
    throw new UserError("Зөвхөн багш энэ үйлдлийг хийх эрхтэй.");
  }
}

async function requireAdmin(): Promise<void> {
  const session = await auth();
  const profile = session?.user?.id
    ? await getUserProfile(session.user.id)
    : null;
  if (profile?.role !== "admin") {
    throw new UserError("Зөвхөн админ энэ үйлдлийг хийх эрхтэй.");
  }
}

/**
 * Admin-only: appoints/demotes teachers. The admin role itself can never
 * be assigned or removed here — it is bound to SUPER_ADMIN_EMAIL.
 */
export async function setUserRole(
  uid: string,
  role: "student" | "teacher",
  _form?: FormData
): Promise<void> {
  await requireAdmin();
  if (!["student", "teacher"].includes(role)) return;

  const target = await getUserProfile(uid);
  if (!target || target.role === "admin") return;

  await updateUserRole(uid, role);
  revalidatePath("/teacher");
}

/**
 * Admin-only: removes a mistaken registration entirely — profile,
 * submissions, certificates and contest participations. Does NOT block
 * the Google account from signing in again (a fresh profile would be
 * created); it only erases the data.
 */
export async function deleteUser(uid: string, _form?: FormData): Promise<void> {
  await requireAdmin();

  const target = await getUserProfile(uid);
  if (!target || target.role === "admin") return;

  // ON DELETE CASCADE removes submissions, certificates and contest entries.
  await deleteUserCascade(uid);

  revalidatePath("/teacher");
}

const ID_RE = /^[a-z0-9-]{3,60}$/;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/* ------------------------------- modules ------------------------------- */

export async function saveModule(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  try {
    await requireTeacher();

    const id = str(form, "id").toLowerCase();
    const title = str(form, "title");
    const order = Number(str(form, "order"));
    const lesson_mdx = normalizeMdx(str(form, "lesson_mdx"));

    if (!ID_RE.test(id)) {
      return { error: "ID нь 3-60 тэмдэгт, зөвхөн латин жижиг үсэг, тоо, зураас байх ёстой (жишээ: module-04)." };
    }
    if (!title) return { error: "Гарчиг хоосон байна." };
    if (!Number.isFinite(order) || order < 1) return { error: "Дараалал 1-ээс их тоо байх ёстой." };
    if (lesson_mdx.length < 20) return { error: "Хичээлийн агуулга хэт богино байна." };
    const mdxProblem = await mdxError(lesson_mdx);
    if (mdxProblem) return { error: mdxProblem };

    await upsertModule({
      id,
      title,
      order,
      syllabus_ref: str(form, "syllabus_ref"),
      description: str(form, "description"),
      lesson_mdx,
    });
  } catch (err) {
    return { error: userMessage(err) };
  }
  revalidatePath("/modules");
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
}

export async function deleteModule(form: FormData): Promise<void> {
  await requireTeacher();
  const id = str(form, "id");
  if (ID_RE.test(id)) await deleteModuleDoc(id);
  revalidatePath("/modules");
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
}

/* ------------------------------ challenges ----------------------------- */

function parseTests(raw: string): PublicTestCase[] {
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as { input: string; expected_output: string }[];
  return parsed
    .filter((t) => typeof t.input === "string" && typeof t.expected_output === "string")
    .map((t) => ({ input: t.input, expected_output: t.expected_output }));
}

export async function saveChallenge(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  let moduleId = "";
  try {
    await requireTeacher();

    const id = str(form, "id").toLowerCase();
    moduleId = str(form, "module_id");
    const type = str(form, "type") as ChallengeType;
    const title = str(form, "title");
    const prompt = normalizeMdx(str(form, "prompt"));
    const xp = Number(str(form, "xp_reward"));
    const order = Number(str(form, "order"));

    if (!ID_RE.test(id)) {
      return { error: "ID нь 3-60 тэмдэгт, зөвхөн латин жижиг үсэг, тоо, зураас байх ёстой (жишээ: ch-04-loops)." };
    }
    if (!["coding", "mcq", "tracing", "theory", "logic"].includes(type)) {
      return { error: "Төрөл буруу байна." };
    }
    if (!title) return { error: "Гарчиг хоосон байна." };
    if (!prompt) return { error: "Даалгаврын өгүүлбэр хоосон байна." };
    if (!Number.isFinite(xp) || xp < 1 || xp > 500) return { error: "XP 1-500 хооронд байх ёстой." };
    if (!Number.isFinite(order) || order < 1) return { error: "Дараалал 1-ээс их тоо байх ёстой." };

    const hint = str(form, "hint");
    const challenge: Challenge = {
      id,
      module_id: moduleId,
      type,
      title,
      prompt,
      xp_reward: xp,
      order,
      ...(hint ? { has_hint: true } : {}),
    };
    const privateData: ChallengePrivate = { ...(hint ? { hint } : {}) };

    if (type === "coding") {
      const publicTests = parseTests(str(form, "public_tests"));
      const hiddenTests = parseTests(str(form, "hidden_tests"));
      if (publicTests.length === 0) {
        return { error: "Дор хаяж нэг нээлттэй тест шаардлагатай." };
      }
      challenge.language = "python";
      challenge.starter_code = (form.get("starter_code") as string | null) ?? "";
      challenge.public_test_cases = publicTests;
      privateData.hidden_test_cases = hiddenTests;
    } else if (type === "mcq") {
      const options = str(form, "options")
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean);
      const correct = Number(str(form, "correct_index"));
      if (options.length < 2) return { error: "Дор хаяж 2 сонголт шаардлагатай (мөр бүрт нэг)." };
      if (!Number.isInteger(correct) || correct < 1 || correct > options.length) {
        return { error: `Зөв хариултын дугаар 1-${options.length} хооронд байх ёстой.` };
      }
      challenge.options = options;
      privateData.correct_answer_index = correct - 1;
    } else if (type === "tracing") {
      const expected = str(form, "expected_answer");
      if (!expected) return { error: "Хүлээгдэх хариулт хоосон байна." };
      privateData.expected_answer = expected;
    } else if (type === "theory") {
      const scheme = str(form, "mark_scheme");
      if (!scheme) return { error: "Үнэлгээний схем хоосон байна." };
      privateData.mark_scheme = scheme;
    } else if (type === "logic") {
      const parsed = parseLogicSpecJson(str(form, "logic_spec"), str(form, "expected_table"));
      if (!parsed.ok) return { error: parsed.errors.join(" ") };
      challenge.logic_spec = parsed.spec;
      privateData.expected_table = parsed.table;
    }

    await upsertChallenge(challenge, privateData);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { error: "Тестүүдийн формат буруу байна." };
    }
    return { error: userMessage(err) };
  }
  revalidatePath("/teacher/content");
  revalidatePath(`/modules/${moduleId}`);
  redirect("/teacher/content");
}

export async function deleteChallenge(form: FormData): Promise<void> {
  await requireTeacher();
  const id = str(form, "id");
  if (ID_RE.test(id)) await deleteChallengeDoc(id);
  revalidatePath("/teacher/content");
  redirect("/teacher/content");
}
