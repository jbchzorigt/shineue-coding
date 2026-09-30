import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NEWS_CATEGORY,
  NEWS_CATEGORIES,
  categoryFromParam,
  isNewsCategory,
  newsCategoryInfo,
} from "@/lib/news-categories";

test("the fixed list has unique ids and Mongolian labels", () => {
  const ids = NEWS_CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(DEFAULT_NEWS_CATEGORY));
  for (const c of NEWS_CATEGORIES) assert.match(c.label, /^[А-ЯӨҮЁ][а-яөүё ]+$/);
});

test("isNewsCategory accepts only listed ids", () => {
  assert.equal(isNewsCategory("contest"), true);
  assert.equal(isNewsCategory("Contest"), false);
  assert.equal(isNewsCategory(""), false);
  assert.equal(isNewsCategory(undefined), false);
});

test("categoryFromParam reads ?category= and ignores anything unknown", () => {
  assert.equal(categoryFromParam("contest"), "contest");
  assert.equal(categoryFromParam(["lesson", "contest"]), "lesson");
  assert.equal(categoryFromParam("nope"), null);
  assert.equal(categoryFromParam(undefined), null);
});

test("newsCategoryInfo falls back to the default for unknown ids", () => {
  assert.equal(newsCategoryInfo("achievement").label, "Амжилт");
  assert.equal(newsCategoryInfo("gone").id, DEFAULT_NEWS_CATEGORY);
});
