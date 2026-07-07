import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";

export interface NewsPost {
  id: string;
  title: string;
  /** Markdown body — images can also be embedded inline. */
  body_mdx: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  author_name: string | null;
  author_uid: string;
  /** epoch ms */
  published_at: number;
}

const NEWS = "news";

function fromSnap(snap: FirebaseFirestore.DocumentSnapshot): NewsPost {
  const d = snap.data()!;
  return {
    id: snap.id,
    title: d.title ?? "",
    body_mdx: d.body_mdx ?? "",
    image_url: d.image_url ?? null,
    video_url: d.video_url ?? null,
    audio_url: d.audio_url ?? null,
    author_name: d.author_name ?? null,
    author_uid: d.author_uid ?? "",
    published_at: d.published_at
      ? (d.published_at as Timestamp).toMillis()
      : Date.now(),
  };
}

/** Newest first. */
export async function listNews(): Promise<NewsPost[]> {
  const snap = await getDb().collection(NEWS).get();
  return snap.docs.map(fromSnap).sort((a, b) => b.published_at - a.published_at);
}

export async function getNews(id: string): Promise<NewsPost | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const snap = await getDb().collection(NEWS).doc(id).get();
  return snap.exists ? fromSnap(snap) : null;
}

export async function createNews(
  data: Omit<NewsPost, "id" | "published_at">
): Promise<string> {
  const ref = await getDb().collection(NEWS).add({
    ...data,
    published_at: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateNews(
  id: string,
  data: Partial<Omit<NewsPost, "id" | "published_at" | "author_uid">>
): Promise<void> {
  await getDb().collection(NEWS).doc(id).update(data);
}

export async function deleteNews(id: string): Promise<void> {
  await getDb().collection(NEWS).doc(id).delete();
}
