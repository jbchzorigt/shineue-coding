import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { BLOB_PATH_RE, parseUploadPayload, uploadTokenOptions } from "@/lib/blob-upload";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

/** Issues short-lived client tokens so the browser uploads news media straight to Vercel Blob. */
export async function POST(req: Request) {
  // Outside the proxy (its matcher skips api/uploads), so check here.
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  if (session.user.mustChangePassword) return fail("Эхлээд нууц үгээ солино уу.", 403);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ файл оруулах эрхтэй.", 403);

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token") return fail("Хүсэлт буруу байна.", 400);
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = parseUploadPayload(clientPayload);
        if (!kind || !BLOB_PATH_RE.test(pathname)) throw new Error("Хүсэлт буруу байна.");
        return uploadTokenOptions(kind);
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Blob token failed:", err);
    return fail("Хүсэлт буруу байна.", 400);
  }
}
