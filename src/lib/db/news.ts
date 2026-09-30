import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { news } from "@/lib/db/schema";

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

function toNews(r: typeof news.$inferSelect): NewsPost {
  return { ...r, published_at: r.published_at.getTime() };
}

/** Newest first. */
export async function listNews(): Promise<NewsPost[]> {
  const rows = await getDb().select().from(news).orderBy(desc(news.published_at));
  return rows.map(toNews);
}

export async function getNews(id: string): Promise<NewsPost | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const [row] = await getDb().select().from(news).where(eq(news.id, id)).limit(1);
  return row ? toNews(row) : null;
}

export async function createNews(data: Omit<NewsPost, "id" | "published_at">): Promise<string> {
  const id = newId();
  await getDb().insert(news).values({ id, ...data });
  return id;
}

export async function updateNews(
  id: string,
  data: Partial<Omit<NewsPost, "id" | "published_at" | "author_uid">>
): Promise<void> {
  await getDb().update(news).set(data).where(eq(news.id, id));
}

export async function deleteNews(id: string): Promise<void> {
  await getDb().delete(news).where(eq(news.id, id));
}
