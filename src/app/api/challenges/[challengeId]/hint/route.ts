import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getChallenge, getChallengePrivate } from "@/lib/db/challenges";
import { getUserProfile } from "@/lib/db/users";
import { getSubmission, markHintUsed } from "@/lib/db/submissions";
import { NotFoundError } from "@/lib/errors";
import { isStaff } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Нэвтрээгүй байна." }, { status: 401 });
  }
  const uid = session.user.id;

  const { challengeId } = await params;
  const challenge = await getChallenge(challengeId);
  if (!challenge) {
    return NextResponse.json({ message: "Даалгавар олдсонгүй." }, { status: 404 });
  }

  const profile = await getUserProfile(uid);
  const isUnlocked =
    isStaff(profile?.role) ||
    (profile?.unlocked_modules ?? []).includes(challenge.module_id);
  if (!isUnlocked) {
    return NextResponse.json({ message: "Энэ модуль танд түгжээтэй байна." }, { status: 403 });
  }

  const hint = (await getChallengePrivate(challengeId))?.hint;
  if (!hint) {
    return NextResponse.json({ message: "Энэ даалгаварт hint алга." }, { status: 404 });
  }

  // Already passed → the hint is free; otherwise record the penalty
  // BEFORE the text leaves the server.
  const submission = await getSubmission(uid, challengeId);
  if (!submission?.passed && !submission?.hint_used) {
    try {
      await markHintUsed(uid, challengeId);
    } catch (err) {
      if (err instanceof NotFoundError) {
        return NextResponse.json({ message: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  return NextResponse.json({ hint });
}
