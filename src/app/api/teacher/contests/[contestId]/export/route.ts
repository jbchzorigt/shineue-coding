import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { getContest, listParticipants, listProblems } from "@/lib/db/contests";
import { allContestSubmissions } from "@/lib/db/contest-submissions";
import { attemptsCsv, resultsCsv } from "@/lib/contest-export";
import { isStaff } from "@/lib/types";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

/** CSV for Excel: ?type=results («Дүн») or ?type=attempts («Бүх оролдлого»). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ татах эрхтэй.", 403);

  const type = req.nextUrl.searchParams.get("type");
  if (type !== "results" && type !== "attempts") return fail("Файлын төрөл буруу байна.", 400);
  const { contestId } = await params;
  const contest = await getContest(contestId);
  if (!contest) return fail("Тэмцээн олдсонгүй.", 404);

  const problems = await listProblems(contestId);
  const body =
    type === "results"
      ? resultsCsv(problems, await listParticipants(contestId))
      : attemptsCsv(problems, await allContestSubmissions(contestId));
  const filename = `${contest.id}-${type === "results" ? "dun" : "oroldlogo"}.csv`;

  // The BOM makes Excel read the file as UTF-8 (Cyrillic).
  return new NextResponse(`﻿${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
