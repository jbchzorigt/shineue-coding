import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { news } from "@/lib/db/schema";
import { createNews, deleteNews, getNews, listNews, updateNews } from "@/lib/db/news";

beforeEach(resetDb);
after(closeDb);

const post = {
  title: "Мэдээ",
  body_mdx: "Агуулга энд байна",
  image_url: null,
  video_url: "https://youtu.be/x",
  audio_url: null,
  author_name: "Багш",
  author_uid: "t1",
  category: "announcement" as const,
};

test("createNews stores a post under a random id, published now", async () => {
  const id = await createNews(post);
  assert.match(id, /^[A-Za-z0-9]{20}$/);
  const got = await getNews(id);
  assert.ok(got);
  assert.deepEqual({ ...got, published_at: 0 }, { ...post, id, published_at: 0 });
  assert.ok(Math.abs(got.published_at - Date.now()) < 60_000);
});

test("listNews returns newest first", async () => {
  await getDb().insert(news).values([
    { id: "old", ...post, published_at: new Date("2026-01-01T00:00:00Z") },
    { id: "new", ...post, published_at: new Date("2026-02-01T00:00:00Z") },
  ]);
  assert.deepEqual((await listNews()).map((p) => p.id), ["new", "old"]);
});

test("updateNews changes only the given fields; deleteNews removes the post", async () => {
  const id = await createNews(post);
  await updateNews(id, { title: "Засварласан", image_url: "https://x/y.png" });
  const got = await getNews(id);
  assert.equal(got?.title, "Засварласан");
  assert.equal(got?.image_url, "https://x/y.png");
  assert.equal(got?.body_mdx, post.body_mdx);
  await deleteNews(id);
  assert.equal(await getNews(id), null);
});

test("getNews rejects malformed ids", async () => {
  assert.equal(await getNews("bad-id!"), null);
});

test("listNews filters by category and limits the count", async () => {
  await getDb().insert(news).values([
    { id: "a", ...post, category: "contest", published_at: new Date("2026-01-01T00:00:00Z") },
    { id: "b", ...post, category: "lesson", published_at: new Date("2026-01-02T00:00:00Z") },
    { id: "c", ...post, category: "contest", published_at: new Date("2026-01-03T00:00:00Z") },
  ]);
  assert.deepEqual((await listNews({ category: "contest" })).map((p) => p.id), ["c", "a"]);
  assert.deepEqual((await listNews({ limit: 2 })).map((p) => p.id), ["c", "b"]);
  assert.deepEqual((await listNews({ category: "achievement" })).map((p) => p.id), []);
});

test("posts saved without a category are announcements; unknown ones are refused", async () => {
  const legacy: Partial<typeof post> = { ...post };
  delete legacy.category;
  await getDb().insert(news).values({ id: "legacy", ...(legacy as Omit<typeof post, "category">) });
  assert.equal((await getNews("legacy"))?.category, "announcement");
  await assert.rejects(
    getDb().insert(news).values({ id: "bad", ...post, category: "gossip" as never })
  );
});

test("updateNews can move a post to another category", async () => {
  const id = await createNews(post);
  await updateNews(id, { category: "achievement" });
  assert.equal((await getNews(id))?.category, "achievement");
});
