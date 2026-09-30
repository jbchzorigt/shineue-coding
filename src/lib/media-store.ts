import "server-only";

import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UserError } from "@/lib/errors";
import type { ImageFormat } from "@/lib/media";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_SIDE = 1920;

/**
 * Outside public/: files added after `next build` are served by /media/[name].
 * turbopackIgnore: a runtime folder, not something to trace into the build.
 */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads");
}

export function newMediaId(): string {
  return Array.from({ length: 24 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/**
 * Re-encodes an image: EXIF (phone GPS!) is dropped, orientation applied,
 * and anything larger than 1920px shrunk. GIFs stay GIFs so they keep
 * their animation; everything else becomes WebP.
 */
export async function processImage(
  bytes: Uint8Array,
  format: ImageFormat
): Promise<{ bytes: Buffer; ext: "webp" | "gif" }> {
  const fit = { fit: "inside", withoutEnlargement: true } as const;
  try {
    if (format === "gif") {
      const out = await sharp(bytes, { animated: true }).resize(MAX_SIDE, MAX_SIDE, fit).gif().toBuffer();
      return { bytes: out, ext: "gif" };
    }
    const out = await sharp(bytes).rotate().resize(MAX_SIDE, MAX_SIDE, fit).webp({ quality: 82 }).toBuffer();
    return { bytes: out, ext: "webp" };
  } catch {
    throw new UserError("Зургийг уншиж чадсангүй.");
  }
}

/** Writes a new file (never overwrites) and returns its name. */
export async function saveUpload(bytes: Uint8Array, ext: string, dir = uploadDir()): Promise<string> {
  await mkdir(dir, { recursive: true });
  const name = `${newMediaId()}.${ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ dir, name), bytes, { flag: "wx" });
  return name;
}
