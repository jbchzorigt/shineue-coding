import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { getContest, listProblems } from "@/lib/db/contests";
import { allContestSubmissions } from "@/lib/db/contest-submissions";
import { attemptFileName, studentZip, studentZipName } from "@/lib/submission-files";
import { isStaff } from "@/lib/types";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

const CONTENT_TYPES: Record<string, string> = {
  py: "text/x-python; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  zip: "application/zip",
};

/** File names are ASCII-only (see submission-files), so they go into the header as they are. */
function download(body: BodyInit, filename: string): NextResponse {
  const ext = filename.slice(filename.lastIndexOf(".") + 1);
  return new NextResponse(body, {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * A student's contest code, for staff: ?student=<uid>&attempt=<id> is one
 * attempt as a file, ?student=<uid> alone is all of them as a zip.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ татах эрхтэй.", 403);

  const student = req.nextUrl.searchParams.get("student");
  if (!student) return fail("Сурагч сонгоогүй байна.", 400);
  const attemptId = req.nextUrl.searchParams.get("attempt");
  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) return fail("Тэмцээн олдсонгүй.", 404);

  const [problems, rows] = await Promise.all([
    listProblems(contestId),
    allContestSubmissions(contestId, { uid: student }),
  ]);
  if (rows.length === 0) return fail("Энэ сурагчийн илгээлт алга.", 404);

  if (attemptId !== null) {
    const row = rows.find((r) => String(r.id) === attemptId);
    if (!row) return fail("Оролдлого олдсонгүй.", 404);
    const problem = problems.find((p) => p.id === row.problem_id);
    return download(row.code, attemptFileName(row, problem));
  }
  return download(studentZip(rows, problems), studentZipName(contest.id, rows[0].email, student));
}
