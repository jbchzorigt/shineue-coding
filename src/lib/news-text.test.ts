import { test } from "node:test";
import assert from "node:assert/strict";
import { newsExcerpt } from "@/lib/news-text";

test("newsExcerpt drops images, keeps link text and markdown-free words", () => {
  const body = "# Гарчиг\n\n![зураг](/media/abcdefghijklmnopqrstuvwx.webp)\n**Тод** [холбоос](https://x.y) `код` текст";
  assert.equal(newsExcerpt(body), "Гарчиг Тод холбоос код текст");
});

test("newsExcerpt cuts long bodies", () => {
  assert.equal(newsExcerpt("а".repeat(300)).length, 200);
  assert.equal(newsExcerpt("а б в", 3), "а б");
});
