import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  applySubmissionScore,
  contestStatus,
  getContest,
  getParticipant,
  getProblem,
  getProblemPrivate,
} from "@/lib/db/contests";
import { getUserProfile } from "@/lib/db/users";
import { NotFoundError } from "@/lib/errors";
import { gradeLogic } from "@/lib/logic/grade";
import { gradePython } from "@/lib/piston";
import { isStaff } from "@/lib/types";
import type {
  LogicResultDto,
  TestResultDto,
} from "@/app/api/challenges/[challengeId]/submit/route";

// Sequential Piston runs can exceed Vercel's default function timeout.
export const maxDuration = 60;

const MAX_CODE_LENGTH = 20_000;
const COOLDOWN_MS = 5_000;
const lastSubmitAt = new Map<string, number>();

/** What one attempt earned, before it is scored. */
interface Attempt {
  stored: string;
  passedTests: number;
  totalTests: number;
  results: TestResultDto[];
  logic?: LogicResultDto;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string; problemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Нэвтрээгүй байна." }, { status: 401 });
  }
  const uid = session.user.id;

  const now = Date.now();
  if (now - (lastSubmitAt.get(uid) ?? 0) < COOLDOWN_MS) {
    return NextResponse.json(
      { message: "Хэт олон удаа илгээлээ — хэдэн секунд хүлээгээрэй." },
      { status: 429 }
    );
  }
  lastSubmitAt.set(uid, now);

  const { contestId, problemId } = await params;
  const body = (await req.json().catch(() => null)) as { code?: unknown; circuit?: unknown } | null;
  if (!body) {
    return NextResponse.json({ message: "Хүсэлт буруу байна." }, { status: 400 });
  }

  const contest = await getContest(contestId);
  if (!contest) {
    return NextResponse.json({ message: "Тэмцээн олдсонгүй." }, { status: 404 });
  }
  const problem = await getProblem(contestId, problemId);
  if (!problem) {
    return NextResponse.json({ message: "Бодлого олдсонгүй." }, { status: 404 });
  }

  const status = contestStatus(contest);
  const profile = await getUserProfile(uid);
  const staff = isStaff(profile?.role);
  const participant = await getParticipant(contestId, uid);

  // Staff may dry-run problems anytime; students need registration and
  // a running contest, checked server-side against server time.
  if (!staff) {
    if (!participant) {
      return NextResponse.json(
        { message: "Эхлээд тэмцээнд бүртгүүлнэ үү." },
        { status: 403 }
      );
    }
    if (status === "upcoming") {
      return NextResponse.json({ message: "Тэмцээн хараахан эхлээгүй." }, { status: 403 });
    }
    if (status === "finished") {
      return NextResponse.json({ message: "Тэмцээн дууссан — илгээх боломжгүй." }, { status: 403 });
    }
  }

  const priv = await getProblemPrivate(contestId, problemId);
  let attempt: Attempt;
  if (problem.kind === "logic") {
    const expected = priv?.expected_table;
    if (!problem.logic_spec || !expected) {
      return NextResponse.json(
        { message: "Бодлогын тохиргоо дутуу байна. Багшдаа хэлнэ үү." },
        { status: 409 }
      );
    }
    const grade = gradeLogic(problem.logic_spec, expected, body.circuit);
    if (grade.status === "malformed") {
      return NextResponse.json({ message: grade.message }, { status: 400 });
    }
    attempt =
      grade.status === "invalid"
        ? {
            stored: JSON.stringify(grade.circuit),
            passedTests: 0,
            totalTests: expected.length,
            results: [],
            logic: { correctRows: 0, totalRows: expected.length, errors: grade.errors },
          }
        : {
            stored: JSON.stringify(grade.circuit),
            passedTests: grade.correctRows,
            totalTests: grade.totalRows,
            results: [],
            logic: { correctRows: grade.correctRows, totalRows: grade.totalRows },
          };
  } else {
    const code = body.code;
    if (typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ message: "Код хоосон байна." }, { status: 400 });
    }
    if (code.length > MAX_CODE_LENGTH) {
      return NextResponse.json({ message: "Код хэт урт байна." }, { status: 400 });
    }
    const allTests = [
      ...problem.public_test_cases.map((t) => ({ ...t, hidden: false })),
      ...(priv?.hidden_test_cases ?? []).map((t) => ({ ...t, hidden: true })),
    ];
    if (allTests.length === 0) {
      return NextResponse.json({ message: "Бодлогод тест алга." }, { status: 400 });
    }

    let graded;
    try {
      graded = await gradePython(code, allTests);
    } catch (err) {
      console.error("Piston execution failed:", err);
      return NextResponse.json(
        { message: "Код ажиллуулах сервертэй холбогдож чадсангүй. Дахин оролдоно уу." },
        { status: 502 }
      );
    }
    attempt = {
      stored: code,
      passedTests: graded.filter((g) => g.passed).length,
      totalTests: allTests.length,
      results: graded.map((g, i) => {
        const test = allTests[i];
        if (test.hidden) return { passed: g.passed, hidden: true };
        return {
          passed: g.passed,
          hidden: false,
          input: test.input,
          expected: test.expected_output,
          actual: g.actual,
          ...(g.error ? { error: g.error } : {}),
        };
      }),
    };
  }

  const score = Math.round((problem.points * attempt.passedTests) / attempt.totalTests);

  // Staff dry-runs (or staff who registered anyway) never affect the board.
  let bestScore = score;
  let improved = false;
  if (!staff && participant) {
    try {
      ({ bestScore, improved } = await applySubmissionScore({
        contestId,
        uid,
        problemId,
        score,
        code: attempt.stored,
        passedTests: attempt.passedTests,
        totalTests: attempt.totalTests,
      }));
    } catch (err) {
      // The contest (and its participants) was deleted while grading.
      if (err instanceof NotFoundError) {
        return NextResponse.json({ message: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  return NextResponse.json({
    results: attempt.results,
    passedTests: attempt.passedTests,
    totalTests: attempt.totalTests,
    score,
    bestScore,
    improved,
    maxPoints: problem.points,
    logic: attempt.logic,
  });
}
