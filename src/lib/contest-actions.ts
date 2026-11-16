"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import {
  copyProblem,
  decideRequests,
  deleteContest as deleteContestDoc,
  deleteProblem as deleteProblemDoc,
  listRequests,
  registerParticipant,
  upsertContest,
  upsertProblem,
} from "@/lib/db/contests";
import { requestUidsInScope } from "@/lib/contest-access";
import { parseDivisionForm } from "@/lib/contest-division";
import { NotFoundError, UserError, userMessage } from "@/lib/errors";
import { parseLogicSpecJson } from "@/lib/logic/spec";
import { normalizeMdx } from "@/lib/mdx-check";
import { isStaff, type PublicTestCase } from "@/lib/types";
import type { ActionState } from "@/lib/teacher-actions";

const ID_RE = /^[a-z0-9-]{3,60}$/;

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/** Returns the staff member's uid. */
async function requireStaff(): Promise<string> {
  const session = await auth();
  const uid = session?.user?.id;
  const profile = uid ? await getUserProfile(uid) : null;
  if (!uid || !isStaff(profile?.role)) {
    throw new UserError("Зөвхөн багш энэ үйлдлийг хийх эрхтэй.");
  }
  return uid;
}

/* ----------------------------- registration ---------------------------- */

export async function registerForContest(contestId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!ID_RE.test(contestId)) return;

  try {
    await registerParticipant(contestId, {
      uid: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? "",
    });
  } catch (err) {
    // The contest was deleted meanwhile, or the session outlived its account.
    if (err instanceof NotFoundError) redirect("/contests");
    // Outside the division's grade range: the contest page shows why.
    if (err instanceof UserError) redirect(`/contests/${contestId}`);
    throw err;
  }
  revalidatePath("/contests");
  revalidatePath(`/contests/${contestId}`);
  redirect(`/contests/${contestId}`);
}

/**
 * A teacher/admin approves or rejects requests: one or more `uid` fields, or a
 * `scope` ("all" / "class:<анги>") that picks this contest's pending requests.
 */
export async function decideContestRequests(
  contestId: string,
  decision: "approved" | "rejected",
  form: FormData
): Promise<void> {
  const staffUid = await requireStaff();
  if (!ID_RE.test(contestId)) return;
  if (decision !== "approved" && decision !== "rejected") return;

  const scope = str(form, "scope");
  const uids = scope
    ? requestUidsInScope(await listRequests(contestId), scope)
    : form.getAll("uid").filter((v): v is string => typeof v === "string");
  await decideRequests(contestId, uids, decision, staffUid);

  revalidatePath("/teacher/contests");
  revalidatePath(`/teacher/contests/${contestId}`);
  revalidatePath("/contests");
  revalidatePath(`/contests/${contestId}`);
  revalidatePath(`/contests/${contestId}/leaderboard`);
}

/** Copies a problem (with hidden tests) into another contest, then opens that contest. */
export async function copyContestProblem(
  fromContestId: string,
  problemId: string,
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  const to = str(form, "to");
  try {
    await requireStaff();
    if (!ID_RE.test(fromContestId) || !ID_RE.test(to)) return { error: "Тэмцээн олдсонгүй." };
    await copyProblem(fromContestId, problemId, to);
  } catch (err) {
    return { error: userMessage(err) };
  }
  revalidatePath(`/teacher/contests/${to}`);
  redirect(`/teacher/contests/${to}`);
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
    const division = parseDivisionForm(
      str(form, "series"),
      str(form, "division_mode"),
      str(form, "grade_min"),
      str(form, "grade_max")
    );
    if (!division.ok) return { error: division.error };

    await upsertContest({
      id,
      title,
      description: str(form, "description"),
      starts_at: starts,
      ends_at: ends,
      requires_approval: form.get("requires_approval") === "on",
      ...division.value,
    });
  } catch (err) {
    return { error: userMessage(err) };
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
    const prompt = normalizeMdx(str(form, "prompt"));
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

    if (str(form, "kind") === "logic") {
      const parsed = parseLogicSpecJson(str(form, "logic_spec"), str(form, "expected_table"));
      if (!parsed.ok) return { error: parsed.errors.join(" ") };
      await upsertProblem(
        contestId,
        { id, title, prompt, points, order, kind: "logic", public_test_cases: [], logic_spec: parsed.spec },
        { hidden_test_cases: [], expected_table: parsed.table }
      );
    } else {
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
          kind: "python",
          starter_code: (form.get("starter_code") as string | null) ?? "",
          public_test_cases: publicTests,
        },
        { hidden_test_cases: hiddenTests }
      );
    }
  } catch (err) {
    if (err instanceof SyntaxError) return { error: "Тестүүдийн формат буруу байна." };
    return { error: userMessage(err) };
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
