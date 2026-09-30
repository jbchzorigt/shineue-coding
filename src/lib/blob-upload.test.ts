import { test } from "node:test";
import assert from "node:assert/strict";
import {
  audioContentType,
  BLOB_PATH_RE,
  blobPathname,
  fitWithin,
  parseUploadPayload,
  uploadTokenOptions,
} from "@/lib/blob-upload";

test("fitWithin shrinks the long side to 1920 and leaves small images alone", () => {
  assert.deepEqual(fitWithin(3000, 2000), { width: 1920, height: 1280 });
  assert.deepEqual(fitWithin(1000, 3000), { width: 640, height: 1920 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
});

test("blobPathname makes fresh news/<24>.<ext> paths the token route accepts", () => {
  const a = blobPathname("webp");
  assert.match(a, BLOB_PATH_RE);
  assert.notEqual(a, blobPathname("webp"));
  for (const bad of ["news/../x.webp", "other/abcdefghijklmnopqrstuvwx.webp", "news/abcdefghijklmnopqrstuvwx.svg", "news/ABCDEFGHIJKLMNOPQRSTUVWX.webp"]) {
    assert.equal(BLOB_PATH_RE.test(bad), false, bad);
  }
});

test("uploadTokenOptions limits type and size per kind", () => {
  assert.deepEqual(uploadTokenOptions("image"), {
    allowedContentTypes: ["image/webp", "image/jpeg", "image/gif"],
    maximumSizeInBytes: 5 * 1024 * 1024,
    addRandomSuffix: true,
  });
  const audio = uploadTokenOptions("audio");
  assert.equal(audio.maximumSizeInBytes, 20 * 1024 * 1024);
  assert.ok(audio.allowedContentTypes.includes("audio/mpeg"));
  assert.ok(!audio.allowedContentTypes.some((t) => t.startsWith("image/")));
});

test("audioContentType names each format", () => {
  assert.deepEqual(
    (["mp3", "m4a", "wav", "ogg"] as const).map(audioContentType),
    ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg"]
  );
});

test("parseUploadPayload accepts only {kind: image|audio}", () => {
  assert.equal(parseUploadPayload('{"kind":"image"}'), "image");
  assert.equal(parseUploadPayload('{"kind":"audio"}'), "audio");
  for (const bad of [null, "", "x", '{"kind":"video"}', "[]"]) assert.equal(parseUploadPayload(bad), null);
});
