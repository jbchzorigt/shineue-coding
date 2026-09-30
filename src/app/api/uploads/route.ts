import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { UserError } from "@/lib/errors";
import { detectMedia, MAX_AUDIO_BYTES, mediaLimitError, TYPE_MESSAGE } from "@/lib/media";
import { processImage, saveUpload } from "@/lib/media-store";
import { isStaff } from "@/lib/types";

/** The largest allowed file plus room for the multipart envelope. */
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 1024 * 1024;

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

export async function POST(req: NextRequest) {
  // This route bypasses the proxy, so it checks the session itself.
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  if (session.user.mustChangePassword) return fail("Эхлээд нууц үгээ солино уу.", 403);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ файл оруулах эрхтэй.", 403);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
    return fail("Файл хэт том байна.", 413);
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || (kind !== "image" && kind !== "audio")) {
    return fail("Хүсэлт буруу байна.", 400);
  }
  const tooBig = mediaLimitError(file.size, kind);
  if (tooBig) return fail(tooBig, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const media = detectMedia(bytes);
  if (!media || media.kind !== kind) return fail(TYPE_MESSAGE[kind], 415);

  try {
    const stored =
      media.kind === "image" ? await processImage(bytes, media.format) : { bytes, ext: media.format };
    const name = await saveUpload(stored.bytes, stored.ext);
    return NextResponse.json({ url: `/media/${name}` });
  } catch (err) {
    if (err instanceof UserError) return fail(err.message, 415);
    console.error("Upload failed:", err);
    return fail("Файл хадгалахад алдаа гарлаа.", 500);
  }
}
