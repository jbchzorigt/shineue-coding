"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import {
  deleteContest as deleteContestDoc,
  deleteProblem as deleteProblemDoc,
  registerParticipant,
  upsertContest,
  upsertProblem,
} from "@/lib/firebase/contests";
import { isStaff, type PublicTestCase } from "@/lib/types";
import type { ActionState } from "@/lib/teacher-actions";

const ID_RE = /^[a-z0-9-]{3,60}$/;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function requireStaff(): Promise<void> {
  const session = await auth();
  const profile = session?.user?.id ? await getUserProfile(session.user.id) : null;
  if (!isStaff(profile?.role)) {
    throw new Error("Зөвхөн багш энэ үйлдлийг хийх эрхтэй.");
  }
}

/* ----------------------------- registration ---------------------------- */

export async function registerForContest(contestId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!ID_RE.test(contestId)) return;

  await registerParticipant(contestId, {
    uid: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
  });
  revalidatePath("/contests");
  revalidatePath(`/contests/${contestId}`);
  redirect(`/contests/${contestId}`);
}

/* ------------------------------- contests ------------------------------ */

export async function saveContest(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  try {
    await requireStaff();

    const id = str(form, "id").toLowerCase();
    const title = str(form, "title");
    const starts = Number(str(form, "starts_at_ms"));
    const ends = Number(str(form, "ends_at_ms"));

    if (!ID_RE.test(id)) {
      return { error: "ID нь 3-60 тэмдэгт, зөвхөн латин жижиг үсэг, тоо, зураас байх ёстой (жишээ: contest-2026-09)." };
    }
    if (!title) return { error: "Гарчиг хоосон байна." };
    if (!Number.isFinite(starts) || !Number.isFinite(ends) || starts <= 0 || ends <= 0) {
      return { error: "Эхлэх/дуусах цагаа сонгоно уу." };
    }
    if (ends <= starts) return { error: "Дуусах цаг эхлэх цагаас хойно байх ёстой." };

    await upsertContest({
      id,
      title,
      description: str(form, "description"),
      starts_at: starts,
      ends_at: ends,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа." };
  }
  revalidatePath("/contests");
  revalidatePath("/teacher/contests");
  redirect("/teacher/contests");
}

export async function deleteContest(form: FormData): Promise<void> {
  await requireStaff();
  const id = str(form, "id");
  if (ID_RE.test(id)) await deleteContestDoc(id);
  revalidatePath("/contests");
  revalidatePath("/teacher/contests");
  redirect("/teacher/contests");
}

/* ------------------------------- problems ------------------------------ */

function parseTests(raw: string): PublicTestCase[] {
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw) as { input: string; expected_output: string }[];
  return parsed
    .filter((t) => typeof t.input === "string" && typeof t.expected_output === "string")
    .map((t) => ({ input: t.input, expected_output: t.expected_output }));
}

export async function saveContestProblem(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  let contestId = "";
  try {
    await requireStaff();

    contestId = str(form, "contest_id");
    const id = str(form, "id").toLowerCase();
    const title = str(form, "title");
    const prompt = str(form, "prompt");
    const points = Number(str(form, "points"));
    const order = Number(str(form, "order"));

    if (!ID_RE.test(contestId)) return { error: "Тэмцээний ID буруу байна." };
    if (!ID_RE.test(id)) {
      return { error: "Бодлогын ID нь 3-60 тэмдэгт, зөвхөн латин жижиг үсэг, тоо, зураас байх ёстой." };
    }
    if (!title) return { error: "Гарчиг хоосон байна." };
    if (!prompt) return { error: "Бодлогын өгүүлбэр хоосон байна." };
    if (!Number.isFinite(points) || points < 1 || points > 1000) {
      return { error: "Оноо 1-1000 хооронд байх ёстой." };
    }
    if (!Number.isFinite(order) || order < 1) return { error: "Дараалал 1-ээс их тоо байх ёстой." };

    const publicTests = parseTests(str(form, "public_tests"));
    const hiddenTests = parseTests(str(form, "hidden_tests"));
    if (publicTests.length + hiddenTests.length === 0) {
      return { error: "Дор хаяж нэг тест шаардлагатай." };
    }

    await upsertProblem(
      contestId,
      {
        id,
        title,
        prompt,
        points,
        order,
        starter_code: (form.get("starter_code") as string | null) ?? "",
        public_test_cases: publicTests,
      },
      { hidden_test_cases: hiddenTests }
    );
  } catch (err) {
    if (err instanceof SyntaxError) return { error: "Тестүүдийн формат буруу байна." };
    return { error: err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа." };
  }
  revalidatePath(`/contests/${contestId}`);
  revalidatePath(`/teacher/contests/${contestId}`);
  redirect(`/teacher/contests/${contestId}`);
}

export async function deleteContestProblem(form: FormData): Promise<void> {
  await requireStaff();
  const contestId = str(form, "contest_id");
  const id = str(form, "id");
  if (ID_RE.test(contestId) && ID_RE.test(id)) {
    await deleteProblemDoc(contestId, id);
  }
  revalidatePath(`/teacher/contests/${contestId}`);
  redirect(`/teacher/contests/${contestId}`);
}
