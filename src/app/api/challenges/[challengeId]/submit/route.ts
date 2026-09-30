import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getChallenge, getChallengePrivate } from "@/lib/db/challenges";
import { getUserProfile } from "@/lib/db/users";
import { getSubmission, recordSubmission } from "@/lib/db/submissions";
import { NotFoundError } from "@/lib/errors";
import { newlyOpenedModule, openModules } from "@/lib/progression";
import { gradePython, normalizeOutput } from "@/lib/piston";
import { gradeLogic } from "@/lib/logic/grade";
import type { LogicError } from "@/lib/logic/evaluate";
import { isStaff, type Challenge, type ChallengePrivate } from "@/lib/types";

// Sequential Piston runs can exceed Vercel's default function timeout.
export const maxDuration = 60;

const MAX_ANSWER_LENGTH = 20_000;
const COOLDOWN_MS = 3_000;

/** Per-user submit cooldown. In-memory is fine for a single dev/server instance. */
const lastSubmitAt = new Map<string, number>();

export interface TestResultDto {
  passed: boolean;
  hidden: boolean;
  /** Present only for public tests — hidden tests never leak data. */
  input?: string;
  expected?: string;
  actual?: string;
  error?: string;
}

/** Logic challenges: rows only — which rows were wrong is never sent. */
export interface LogicResultDto {
  correctRows: number;
  totalRows: number;
  /** Structural problems; the attempt still counts as failed. */
  errors?: LogicError[];
}

interface SubmitBody {
  mode?: string;
  /** coding */
  code?: string;
  /** mcq */
  answerIndex?: number;
  /** tracing / theory */
  answer?: string;
  /** theory — student confirms their answer matched the mark scheme. */
  selfAssess?: boolean;
  /** logic — the circuit JSON (untrusted). */
  circuit?: unknown;
}

interface Graded {
  passed: boolean;
  /** Stored as the submission snapshot. */
  snapshot: string;
  results?: TestResultDto[];
  markScheme?: string;
  logic?: LogicResultDto;
  /** When set, skip recording entirely (coding "run" mode). */
  runOnly?: boolean;
  errorResponse?: NextResponse;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Нэвтрээгүй байна." }, { status: 401 });
  }
  const uid = session.user.id;

  const now = Date.now();
  const last = lastSubmitAt.get(uid) ?? 0;
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json(
      { message: "Хэт олон удаа илгээлээ — хэдэн секунд хүлээгээрэй." },
      { status: 429 }
    );
  }
  lastSubmitAt.set(uid, now);

  const { challengeId } = await params;
  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body) {
    return NextResponse.json({ message: "Хүсэлт буруу байна." }, { status: 400 });
  }

  const challenge = await getChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ message: "Даалгавар олдсонгүй." }, { status: 404 });
  }

  // The module gate applies to submissions too, not just the lesson UI.
  const profile = await getUserProfile(uid);
  const staff = isStaff(profile?.role);
  const openBefore = profile && !staff ? await openModules(uid, profile.unlocked_modules) : [];
  if (!staff && !openBefore.some((m) => m.id === challenge.module_id)) {
    return NextResponse.json(
      { message: "Энэ модуль танд түгжээтэй байна." },
      { status: 403 }
    );
  }

  let graded: Graded;
  switch (challenge.type) {
    case "coding":
      graded = await gradeCoding(challenge, body);
      break;
    case "mcq":
      graded = await gradeMcq(challenge, body);
      break;
    case "tracing":
      graded = await gradeTracing(challenge, body);
      break;
    case "theory":
      graded = await gradeTheory(challenge, body, uid);
      break;
    case "logic":
      graded = await gradeLogicChallenge(challenge, body);
      break;
    default:
      return NextResponse.json({ message: "Үл мэдэгдэх төрөл." }, { status: 400 });
  }
  if (graded.errorResponse) return graded.errorResponse;

  if (graded.runOnly) {
    return NextResponse.json({
      passed: graded.passed,
      results: graded.results ?? [],
      xpAwarded: 0,
      unlockedModule: null,
      runOnly: true,
    });
  }

  let xpAwarded: number;
  try {
    ({ xpAwarded } = await recordSubmission({
      uid,
      challengeId,
      code: graded.snapshot,
      passed: graded.passed,
      xpReward: challenge.xp_reward,
    }));
  } catch (err) {
    // The challenge was deleted while Piston was grading it.
    if (err instanceof NotFoundError) {
      return NextResponse.json({ message: err.message }, { status: 404 });
    }
    throw err;
  }

  const unlockedModule =
    graded.passed && !staff ? await newlyOpenedModule(uid, openBefore) : null;

  return NextResponse.json({
    passed: graded.passed,
    results: graded.results ?? [],
    markScheme: graded.markScheme,
    logic: graded.logic,
    xpAwarded,
    unlockedModule,
  });
}

/* ------------------------------------------------------------------ */

function badRequest(message: string): Graded {
  return {
    passed: false,
    snapshot: "",
    errorResponse: NextResponse.json({ message }, { status: 400 }),
  };
}

async function gradeCoding(challenge: Challenge, body: SubmitBody): Promise<Graded> {
  const code = body.code;
  if (typeof code !== "string" || code.trim().length === 0) {
    return badRequest("Код хоосон байна.");
  }
  if (code.length > MAX_ANSWER_LENGTH) {
    return badRequest("Код хэт урт байна.");
  }

  const isRunOnly = body.mode === "run";
  const publicTests = challenge.public_test_cases ?? [];
  const hiddenTests = isRunOnly
    ? []
    : ((await getChallengePrivate(challenge.id))?.hidden_test_cases ?? []);
  const allTests = [
    ...publicTests.map((t) => ({ ...t, hidden: false })),
    ...hiddenTests.map((t) => ({ ...t, hidden: true })),
  ];

  let runs;
  try {
    runs = await gradePython(code, allTests);
  } catch (err) {
    console.error("Piston execution failed:", err);
    return {
      passed: false,
      snapshot: code,
      errorResponse: NextResponse.json(
        { message: "Код ажиллуулах сервертэй холбогдож чадсангүй. Дахин оролдоно уу." },
        { status: 502 }
      ),
    };
  }

  const results: TestResultDto[] = runs.map((g, i) => {
    const test = allTests[i];
    if (test.hidden) {
      // Never leak hidden test inputs/outputs — pass/fail only.
      return { passed: g.passed, hidden: true };
    }
    return {
      passed: g.passed,
      hidden: false,
      input: test.input,
      expected: test.expected_output,
      actual: g.actual,
      ...(g.error ? { error: g.error } : {}),
    };
  });

  return {
    passed: runs.every((g) => g.passed),
    snapshot: code,
    results,
    runOnly: isRunOnly,
  };
}

async function gradeMcq(challenge: Challenge, body: SubmitBody): Promise<Graded> {
  const idx = body.answerIndex;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx >= (challenge.options?.length ?? 0)) {
    return badRequest("Хариултаа сонгоно уу.");
  }
  const priv = await getChallengePrivate(challenge.id);
  if (typeof priv?.correct_answer_index !== "number") {
    return badRequest("Даалгаврын тохиргоо дутуу байна.");
  }
  return {
    passed: idx === priv.correct_answer_index,
    snapshot: String(idx),
  };
}

async function gradeTracing(challenge: Challenge, body: SubmitBody): Promise<Graded> {
  const answer = body.answer;
  if (typeof answer !== "string" || answer.trim().length === 0) {
    return badRequest("Хариулт хоосон байна.");
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return badRequest("Хариулт хэт урт байна.");
  }
  const priv = await getChallengePrivate(challenge.id);
  if (typeof priv?.expected_answer !== "string") {
    return badRequest("Даалгаврын тохиргоо дутуу байна.");
  }
  return {
    passed: normalizeOutput(answer) === normalizeOutput(priv.expected_answer),
    snapshot: answer,
  };
}

/**
 * Theory is a two-step honor-system flow:
 * 1. Submit an answer → the mark scheme is revealed (not passed yet).
 * 2. selfAssess → marked passed + XP. Requires step 1 first.
 */
async function gradeTheory(
  challenge: Challenge,
  body: SubmitBody,
  uid: string
): Promise<Graded> {
  const priv: ChallengePrivate | null = await getChallengePrivate(challenge.id);
  if (typeof priv?.mark_scheme !== "string") {
    return badRequest("Даалгаврын тохиргоо дутуу байна.");
  }

  if (body.selfAssess) {
    const submission = await getSubmission(uid, challenge.id);
    if (!submission?.code_snapshot) {
      return badRequest("Эхлээд хариултаа илгээнэ үү.");
    }
    return {
      passed: true,
      snapshot: submission.code_snapshot,
      markScheme: priv.mark_scheme,
    };
  }

  const answer = body.answer;
  if (typeof answer !== "string" || answer.trim().length < 20) {
    return badRequest("Хариулт хэт богино байна — дор хаяж хэдэн өгүүлбэр бичээрэй.");
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return badRequest("Хариулт хэт урт байна.");
  }
  return {
    passed: false,
    snapshot: answer,
    markScheme: priv.mark_scheme,
  };
}

async function gradeLogicChallenge(challenge: Challenge, body: SubmitBody): Promise<Graded> {
  const expected = (await getChallengePrivate(challenge.id))?.expected_table;
  if (!challenge.logic_spec || !expected) {
    return {
      passed: false,
      snapshot: "",
      errorResponse: NextResponse.json(
        { message: "Бодлогын тохиргоо дутуу байна. Багшдаа хэлнэ үү." },
        { status: 409 }
      ),
    };
  }
  const grade = gradeLogic(challenge.logic_spec, expected, body.circuit);
  if (grade.status === "malformed") return badRequest(grade.message);

  // Stored even when broken, so an unfinished circuit comes back next time.
  const snapshot = JSON.stringify(grade.circuit);
  if (grade.status === "invalid") {
    return {
      passed: false,
      snapshot,
      logic: { correctRows: 0, totalRows: expected.length, errors: grade.errors },
    };
  }
  return {
    passed: grade.correctRows === grade.totalRows,
    snapshot,
    logic: { correctRows: grade.correctRows, totalRows: grade.totalRows },
  };
}
