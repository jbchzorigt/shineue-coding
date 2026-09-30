import { test } from "node:test";
import assert from "node:assert/strict";
import { NotFoundError, UserError, userMessage } from "@/lib/errors";

test("userMessage shows our own messages as they are", () => {
  assert.equal(userMessage(new UserError("Гарчиг хоосон байна.")), "Гарчиг хоосон байна.");
  assert.equal(userMessage(new NotFoundError("Даалгавар олдсонгүй.")), "Даалгавар олдсонгүй.");
});

test("userMessage hides anything else (e.g. SQL with params) behind a generic message", (t) => {
  const logged = t.mock.method(console, "error", () => {});
  const dbError = new Error('Failed query: insert into "modules" values ($1)\nparams: secret');
  assert.equal(userMessage(dbError), "Хадгалахад алдаа гарлаа.");
  assert.equal(userMessage("boom", "Устгахад алдаа гарлаа."), "Устгахад алдаа гарлаа.");
  assert.equal(logged.mock.callCount(), 2);
});
