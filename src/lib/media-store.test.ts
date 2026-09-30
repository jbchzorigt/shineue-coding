import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { UserError } from "@/lib/errors";
import { MEDIA_NAME_RE } from "@/lib/media";
import { processImage, saveUpload } from "@/lib/media-store";

test("processImage strips EXIF and shrinks big photos to WebP", async () => {
  const jpg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#3366cc" } })
    .withExif({ IFD0: { Copyright: "secret", ImageDescription: "GPS test" } })
    .jpeg()
    .toBuffer();
  assert.ok((await sharp(jpg).metadata()).exif, "the fixture carries EXIF");

  const out = await processImage(jpg, "jpeg");
  const meta = await sharp(out.bytes).metadata();
  assert.equal(out.ext, "webp");
  assert.deepEqual([meta.format, meta.width, meta.height, meta.exif], ["webp", 1920, 1280, undefined]);
});

test("processImage leaves small images their size and GIFs animated", async () => {
  const png = await sharp({ create: { width: 40, height: 30, channels: 4, background: "#ff0000" } }).png().toBuffer();
  const small = await processImage(png, "png");
  assert.deepEqual([small.ext, (await sharp(small.bytes).metadata()).width], ["webp", 40]);

  const frame = (c: string) =>
    sharp({ create: { width: 20, height: 20, channels: 3, background: c } }).png().toBuffer();
  const gif = await sharp([await frame("#ff0000"), await frame("#00ff00")], { join: { animated: true } })
    .gif()
    .toBuffer();
  const out = await processImage(gif, "gif");
  assert.equal(out.ext, "gif");
  assert.equal((await sharp(out.bytes, { animated: true }).metadata()).pages, 2);
});

test("processImage turns unreadable data into a UserError", async () => {
  await assert.rejects(
    processImage(Buffer.from([0xff, 0xd8, 0xff, 0, 1, 2]), "jpeg"),
    (err) => err instanceof UserError && err.message === "Зургийг уншиж чадсангүй."
  );
});

test("saveUpload writes each file under a fresh name", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uploads-"));
  try {
    const a = await saveUpload(Buffer.from("one"), "mp3", dir);
    const b = await saveUpload(Buffer.from("two"), "mp3", dir);
    assert.match(a, MEDIA_NAME_RE);
    assert.notEqual(a, b);
    assert.equal(await readFile(path.join(dir, a), "utf8"), "one");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
