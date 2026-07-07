"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { isStaff } from "@/lib/types";
import {
  createNews,
  deleteNews as deleteNewsDoc,
  updateNews,
} from "@/lib/firebase/news";
import type { ActionState } from "@/lib/teacher-actions";

async function requireStaff(): Promise<{ uid: string; name: string | null }> {
  const session = await auth();
  const profile = session?.user?.id ? await getUserProfile(session.user.id) : null;
  if (!profile || !isStaff(profile.role)) {
    throw new Error("Зөвхөн багш/админ мэдээ нийтлэх эрхтэй.");
  }
  return { uid: profile.uid, name: profile.name };
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function urlOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return v;
  } catch {
    return null;
  }
}

export async function saveNews(
  _prev: ActionState,
  form: FormData
): Promise<ActionState> {
  try {
    const author = await requireStaff();

    const id = str(form, "id"); // empty = create
    const title = str(form, "title");
    const body = str(form, "body_mdx");
    if (!title) return { error: "Гарчиг хоосон байна." };
    if (body.length < 10) return { error: "Мэдээний агуулга хэт богино байна." };

    const data = {
      title,
      body_mdx: body,
      image_url: urlOrNull(form, "image_url"),
      video_url: urlOrNull(form, "video_url"),
      audio_url: urlOrNull(form, "audio_url"),
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
    return { error: err instanceof Error ? err.message : "Хадгалахад алдаа гарлаа." };
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
