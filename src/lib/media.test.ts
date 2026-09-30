import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contentTypeFor,
  detectMedia,
  isAllowedMediaUrl,
  isMediaName,
  mediaLimitError,
  parseRange,
} from "@/lib/media";

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const NAME = "abcdefghijklmnopqrstuvwx"; // 24 chars

test("detectMedia recognises the eight supported formats", () => {
  assert.deepEqual(detectMedia(bytes([0xff, 0xd8, 0xff, 0xe0])), { kind: "image", format: "jpeg" });
  assert.deepEqual(detectMedia(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { kind: "image", format: "png" });
  assert.deepEqual(detectMedia(bytes("GIF89a")), { kind: "image", format: "gif" });
  assert.deepEqual(detectMedia(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ")), { kind: "image", format: "webp" });
  assert.deepEqual(detectMedia(bytes("ID3", [4, 0])), { kind: "audio", format: "mp3" });
  assert.deepEqual(detectMedia(bytes([0xff, 0xfb, 0x90, 0x64])), { kind: "audio", format: "mp3" });
  assert.deepEqual(detectMedia(bytes([0, 0, 0, 0x20], "ftypM4A ")), { kind: "audio", format: "m4a" });
  assert.deepEqual(detectMedia(bytes("RIFF", [0, 0, 0, 0], "WAVEfmt ")), { kind: "audio", format: "wav" });
  assert.deepEqual(detectMedia(bytes("OggS", [0])), { kind: "audio", format: "ogg" });
});

test("detectMedia rejects everything else, whatever the file is called", () => {
  const bad = [
    bytes(""),
    bytes("hello world"),
    bytes("MZ", [0x90, 0]),
    bytes("<svg xmlns"),
    bytes("<?xml version"),
    bytes("<!DOCTYPE html>"),
    bytes("RIFF", [0, 0, 0, 0], "AVI "),
    bytes([0xff, 0xd8]),
  ];
  for (const b of bad) assert.equal(detectMedia(b), null);
});

test("parseRange handles the single-range forms", () => {
  assert.equal(parseRange(null, 1000), null);
  assert.deepEqual(parseRange("bytes=0-99", 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange("bytes=100-", 1000), { start: 100, end: 999 });
  assert.deepEqual(parseRange("bytes=-500", 1000), { start: 500, end: 999 });
  assert.deepEqual(parseRange("bytes=-5000", 1000), { start: 0, end: 999 });
  assert.deepEqual(parseRange("bytes=900-5000", 1000), { start: 900, end: 999 });
});

test("parseRange rejects what it cannot serve", () => {
  for (const h of ["bytes=5-2", "bytes=1000-", "bytes=x", "bytes=-", "bytes=0-1,5-6", "items=0-1", "bytes=-0"]) {
    assert.equal(parseRange(h, 1000), "invalid", h);
  }
  assert.equal(parseRange("bytes=0-", 0), "invalid");
});

test("isMediaName accepts only our own file names", () => {
  assert.equal(isMediaName(`${NAME}.webp`), true);
  assert.equal(isMediaName(`${NAME}.mp3`), true);
  for (const bad of ["../x.mp3", `${NAME.toUpperCase()}.webp`, `${NAME}.svg`, "short.webp", `${NAME}.webp.exe`, `../${NAME}.mp3`]) {
    assert.equal(isMediaName(bad), false, bad);
  }
});

test("isAllowedMediaUrl allows web links and our media paths only", () => {
  for (const ok of ["https://example.com/a.jpg", "http://192.168.1.121/x.mp3", `/media/${NAME}.webp`]) {
    assert.equal(isAllowedMediaUrl(ok), true, ok);
  }
  for (const bad of ["javascript:alert(1)", "//evil.com/x.jpg", "/media/../x", `/media/${NAME}.svg`, "data:image/png;base64,AAAA", "/etc/passwd", "ftp://x/y", ""]) {
    assert.equal(isAllowedMediaUrl(bad), false, bad);
  }
});

test("contentTypeFor maps each extension", () => {
  const types = { webp: "image/webp", gif: "image/gif", mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", ogg: "audio/ogg" };
  for (const [ext, type] of Object.entries(types)) assert.equal(contentTypeFor(`${NAME}.${ext}`), type);
});

test("mediaLimitError enforces 5MB images and 20MB audio", () => {
  assert.equal(mediaLimitError(5 * 1024 * 1024, "image"), null);
  assert.equal(mediaLimitError(5 * 1024 * 1024 + 1, "image"), "Зураг 5MB-аас ихгүй байх ёстой.");
  assert.equal(mediaLimitError(20 * 1024 * 1024, "audio"), null);
  assert.equal(mediaLimitError(20 * 1024 * 1024 + 1, "audio"), "Дуу 20MB-аас ихгүй байх ёстой.");
});
