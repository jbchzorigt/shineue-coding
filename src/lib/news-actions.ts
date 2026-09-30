"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { UserError, userMessage } from "@/lib/errors";
import { isAllowedMediaUrl } from "@/lib/media";
import { mdxError, normalizeMdx } from "@/lib/mdx-check";
import { isStaff } from "@/lib/types";
import {
  createNews,
  deleteNews as deleteNewsDoc,
  updateNews,
} from "@/lib/db/news";
import type { ActionState } from "@/lib/teacher-actions";

async function requireStaff(): Promise<{ uid: string; name: string | null }> {
  const session = await auth();
  const profile = session?.user?.id ? await getUserProfile(session.user.id) : null;
  if (!profile || !isStaff(profile.role)) {
    throw new UserError("Зөвхөн багш/админ мэдээ нийтлэх эрхтэй.");
  }
  return { uid: profile.uid, name: profile.name };
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Empty → null; a web link or one of our /media files → kept; anything
 * else is refused out loud rather than silently dropped from the post.
 */
function urlOrNull(form: FormData, key: string, label: string): string | null {
  const v = str(form, key);
  if (!v) return null;
  if (!isAllowedMediaUrl(v)) {
    throw new UserError(`${label} буруу байна: https://-ээр эхэлсэн хаяг оруулна уу.`);
  }
  return v;
}

export async function saveNews(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  try {
    const author = await requireStaff();

    const id = str(form, "id"); // empty = create
    const title = str(form, "title");
    const body = normalizeMdx(str(form, "body_mdx"));
    if (!title) return { error: "Гарчиг хоосон байна." };
    if (body.length < 10) return { error: "Мэдээний агуулга хэт богино байна." };
    const mdxProblem = await mdxError(body);
    if (mdxProblem) return { error: mdxProblem };

    const data = {
      title,
      body_mdx: body,
      image_url: urlOrNull(form, "image_url", "Нүүр зургийн холбоос"),
      video_url: urlOrNull(form, "video_url", "Видео холбоос"),
      audio_url: urlOrNull(form, "audio_url", "Дууны холбоос"),
    };

    if (id) {
      await updateNews(id, data);
    } else {
      await createNews({
        ...data,
        author_uid: author.uid,
        author_name: author.name,
      });
    }
  } catch (err) {
    return { error: userMessage(err) };
  }
  revalidatePath("/news");
  revalidatePath("/teacher/news");
  redirect("/teacher/news");
}

export async function deleteNews(form: FormData): Promise<void> {
  await requireStaff();
  const id = str(form, "id");
  if (/^[A-Za-z0-9]+$/.test(id)) await deleteNewsDoc(id);
  revalidatePath("/news");
  revalidatePath("/teacher/news");
  redirect("/teacher/news");
}
