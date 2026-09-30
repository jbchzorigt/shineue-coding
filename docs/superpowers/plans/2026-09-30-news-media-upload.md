# Мэдээнд зураг, дуу оруулах: хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Багш, админ мэдээнд нүүр зураг, агуулга доторх зураг болон дууг компьютерээсээ файлаар оруулдаг болгох. Файлууд энэ сервер дээр хадгалагдана.

**Architecture:**
- Цэвэр функцуудын модуль `src/lib/media.ts`: төрөл илрүүлэх, range задлах, нэр ба URL шалгах.
- Server-only модуль `src/lib/media-store.ts`: `sharp`-аар зураг цэвэрлэж, дискэнд бичнэ.
- `POST /api/uploads` нь proxy-гоос гадуур ажиллаж, эрхийг өөрөө шалгана.
- `GET /media/[name]` нь файлыг Range дэмжлэгтэйгээр stream хийнэ.
- Мэдээний форм нь XHR-ээр upload хийж, URL-ийг одоогийн `image_url`/`audio_url` талбарт бичнэ. DB-ийн схем өөрчлөгдөхгүй.

**Tech Stack:** Next.js 16.2 route handlers, React 19, `sharp` 0.34.5, `node:test` + tsx.

**Spec:** `docs/superpowers/specs/2026-09-30-news-media-upload-design.md`

## Global Constraints

- **Commit ба push ХИЙХГҮЙ.** Хэрэглэгч "final code" гэж хэлэхэд л commit хийнэ.
- Хязгаар: зураг `5 * 1024 * 1024`, дуу `20 * 1024 * 1024` байт. Request-ийн дээд хэмжээ нь дууны хязгаар + 1MiB.
- Зөвшөөрөгдөх төрлүүд:
  - зураг: JPEG, PNG, WebP, GIF;
  - дуу: MP3, M4A, WAV, OGG.
  - SVG зөвшөөрөгдөхгүй.
- Файлын нэр `/^[a-z0-9]{24}\.(webp|gif|mp3|m4a|wav|ogg)$/`, URL нь `/media/<нэр>`.
- Хадгалах хавтас: `process.env.UPLOAD_DIR` эсвэл `<cwd>/data/uploads`.
- Хэрэглэгчид харагдах мессежүүд монголоор. Next кодыг бичихээс өмнө `node_modules/next/dist/docs/`-ийг шалгана.
- Нэвтэрсэн хөтчийн шалгалтад хэрэглэгч pane дээр өөрөө нэвтэрсэн session-ийг ашиглана. Cookie тохируулахгүй.

## Review Focus

1. **Proxy-гоос гадуур route-д эрхийн шалгалт алдагдах** (сурагч, түр нууц үгтэй хэрэглэгч, нэвтрээгүй хүн). 401/403 буцах ёстой. Шалгалт: Task 5, алхам 6.
2. **Өргөтгөлийг нь сольсон хортой файл** (`.jpg` нэртэй HTML/SVG). Magic bytes-аар татгалзагдах ёстой. `/media` хариунд `nosniff` байх ёстой. Тест: Task 1, `detectMedia rejects…`.
3. **Нийтлэхээс өмнө upload дуусаагүй байх.** "Нийтлэх" идэвхгүй байх ёстой. Шалгалт: Task 5, алхам 2.
4. **Хадгалах үед алдаа гарах** (агуулга хэт богино). Гарчиг, агуулга, оруулсан зургууд үлдэх ёстой. Шалгалт: Task 5, алхам 7.
5. **Аудио гүйлгэх.** Range 206/416 зөв байх ёстой. Тест: Task 1 `parseRange`, Task 3 curl.

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `src/lib/media.ts` (шинэ) | Хязгаар, мессеж, `detectMedia`, `parseRange`, `isMediaName`, `isAllowedMediaUrl`, `contentTypeFor`, `mediaLimitError` |
| `src/lib/news-text.ts` (шинэ) | `newsExcerpt` (жагсаалтын товч текст) |
| `src/lib/media-store.ts` (шинэ) | `uploadDir`, `newMediaId`, `processImage`, `saveUpload` |
| `src/app/api/uploads/route.ts` (шинэ) | Upload |
| `src/app/media/[name]/route.ts` (шинэ) | Файл хүргэх |
| `src/components/teacher/upload-file.ts` (шинэ) | XHR upload helper |
| `src/components/teacher/media-upload-field.tsx` (шинэ) | URL + файл сонгох талбар |
| `src/components/teacher/news-form.tsx` | Controlled талбарууд, upload, "Зураг оруулах" |
| `src/lib/news-actions.ts` | `isAllowedMediaUrl` |
| `src/components/news/news-list.tsx` | `newsExcerpt` |
| `src/proxy.ts` | Matcher-ээс `api/uploads` хасна |
| `package.json`, `.gitignore`, `.env.example`, `README.md` | `sharp`, `/data/`, `UPLOAD_DIR`, баримт |

---

### Task 1: Цэвэр функцууд (`media.ts`, `news-text.ts`)

**Files:** Create `src/lib/media.ts`, `src/lib/news-text.ts`. Test: `src/lib/media.test.ts`, `src/lib/news-text.test.ts`.

**Interfaces — Produces:**
- `MAX_IMAGE_BYTES`, `MAX_AUDIO_BYTES`
- `type MediaKind = "image" | "audio"`, `ImageFormat`, `AudioFormat`
- `detectMedia(bytes: Uint8Array): { kind: "image"; format: ImageFormat } | { kind: "audio"; format: AudioFormat } | null`
- `MEDIA_NAME_RE`, `isMediaName(name)`, `contentTypeFor(name)`
- `parseRange(header: string | null, size: number): { start; end } | "invalid" | null`
- `isAllowedMediaUrl(url)`, `mediaLimitError(size, kind): string | null`, `TYPE_MESSAGE: Record<MediaKind, string>`
- `newsExcerpt(body: string, max = 200): string`

- [ ] **Step 1: Тест бичих**

`src/lib/media.test.ts`:

```ts
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
```

`src/lib/news-text.test.ts`:

```ts
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
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npx tsx --test src/lib/media.test.ts src/lib/news-text.test.ts`
Expected: FAIL — `Cannot find module '@/lib/media'` (болон `news-text`).

- [ ] **Step 3: `src/lib/media.ts` бичих**

```ts
/*
 * Uploaded news media: what we accept, how files are named, and how
 * they are served. Pure functions — shared by the upload route, the
 * media route, the news action and the teacher form.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

export type MediaKind = "image" | "audio";
export type ImageFormat = "jpeg" | "png" | "gif" | "webp";
export type AudioFormat = "mp3" | "m4a" | "wav" | "ogg";
export type DetectedMedia =
  | { kind: "image"; format: ImageFormat }
  | { kind: "audio"; format: AudioFormat };

export const TYPE_MESSAGE: Record<MediaKind, string> = {
  image: "Зөвхөн JPG, PNG, WebP, GIF зураг оруулна.",
  audio: "Зөвхөн MP3, M4A, WAV, OGG дуу оруулна.",
};

const LIMIT: Record<MediaKind, { bytes: number; message: string }> = {
  image: { bytes: MAX_IMAGE_BYTES, message: "Зураг 5MB-аас ихгүй байх ёстой." },
  audio: { bytes: MAX_AUDIO_BYTES, message: "Дуу 20MB-аас ихгүй байх ёстой." },
};

export function mediaLimitError(size: number, kind: MediaKind): string | null {
  return size > LIMIT[kind].bytes ? LIMIT[kind].message : null;
}

function ascii(b: Uint8Array, at: number, text: string): boolean {
  if (b.length < at + text.length) return false;
  for (let i = 0; i < text.length; i++) if (b[at + i] !== text.charCodeAt(i)) return false;
  return true;
}

/** Identifies a file by its first bytes; the name and the browser's MIME type are never trusted. */
export function detectMedia(b: Uint8Array): DetectedMedia | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { kind: "image", format: "jpeg" };
  if (ascii(b, 0, "\x89PNG\r\n\x1a\n")) return { kind: "image", format: "png" };
  if (ascii(b, 0, "GIF87a") || ascii(b, 0, "GIF89a")) return { kind: "image", format: "gif" };
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return { kind: "image", format: "webp" };
  if (ascii(b, 0, "RIFF") && ascii(b, 8, "WAVE")) return { kind: "audio", format: "wav" };
  if (ascii(b, 0, "OggS")) return { kind: "audio", format: "ogg" };
  if (ascii(b, 4, "ftyp")) return { kind: "audio", format: "m4a" };
  if (ascii(b, 0, "ID3") || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) {
    return { kind: "audio", format: "mp3" };
  }
  return null;
}

export const MEDIA_NAME_RE = /^[a-z0-9]{24}\.(webp|gif|mp3|m4a|wav|ogg)$/;

export function isMediaName(name: string): boolean {
  return MEDIA_NAME_RE.test(name);
}

const CONTENT_TYPE: Record<string, string> = {
  webp: "image/webp",
  gif: "image/gif",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function contentTypeFor(name: string): string {
  return CONTENT_TYPE[name.slice(name.lastIndexOf(".") + 1)] ?? "application/octet-stream";
}

/**
 * One `bytes=` range (what browsers send for audio seeking). null = no
 * Range header; "invalid" = answer 416.
 */
export function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (header === null) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return "invalid";
  if (m[1] === "") {
    const suffix = Number(m[2]);
    if (suffix === 0 || size === 0) return "invalid";
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(m[1]);
  const end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

/** Web links, or files this server stored itself. */
export function isAllowedMediaUrl(url: string): boolean {
  if (url.startsWith("/media/")) return isMediaName(url.slice("/media/".length));
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: `src/lib/news-text.ts` бичих**

```ts
/** Plain-text teaser of a markdown news body for the list view. */
export function newsExcerpt(body: string, max = 200): string {
  return body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/[#*`>\[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();
}
```

- [ ] **Step 5: Тест давахыг шалгах**

Run: `npx tsx --test src/lib/media.test.ts src/lib/news-text.test.ts`
Expected: PASS — 10 тест, 0 fail.

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` алдаагүй. Commit хийхгүй.

---

### Task 2: Зураг цэвэрлэх ба хадгалах (`media-store.ts`)

**Files:** Create `src/lib/media-store.ts`. Test: `src/lib/media-store.test.ts`. Modify: `package.json` (`sharp`).

**Interfaces:**
- Consumes (Task 1): `ImageFormat`, `MEDIA_NAME_RE`. `UserError` (`@/lib/errors`).
- Produces: `uploadDir()`, `newMediaId()`, `processImage(bytes, format): Promise<{ bytes: Buffer; ext: "webp" | "gif" }>`, `saveUpload(bytes, ext, dir?): Promise<string>`.

- [ ] **Step 1: `sharp`-ийг шууд dependency болгох**

Run: `npm install sharp@^0.34.5`
Expected: `package.json`-ийн dependencies-д `"sharp": "^0.34.5"` нэмэгдэнэ.

- [ ] **Step 2: Тест бичих** — `src/lib/media-store.test.ts`:

```ts
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
```

- [ ] **Step 3: Тест унахыг шалгах**

Run: `npx tsx --conditions=react-server --test src/lib/media-store.test.ts`
Expected: FAIL — `Cannot find module '@/lib/media-store'`.

- [ ] **Step 4: `src/lib/media-store.ts` бичих**

```ts
import "server-only";

import { randomInt } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UserError } from "@/lib/errors";
import type { ImageFormat } from "@/lib/media";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const MAX_SIDE = 1920;

/** Outside public/: files added after `next build` are served by /media/[name]. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");
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
  await writeFile(path.join(dir, name), bytes, { flag: "wx" });
  return name;
}
```

- [ ] **Step 5: Тест давахыг шалгах**

Run: `npx tsx --conditions=react-server --test src/lib/media-store.test.ts`
Expected: PASS — 4 тест, 0 fail.

- [ ] **Step 6: Checkpoint** — `npx tsc --noEmit` алдаагүй. `npm test` → 128 + 10 + 4 = 142 тест, `# fail 0`. Commit хийхгүй.

---

### Task 3: Route-ууд, proxy, тохиргоо

**Files:**
- Create: `src/app/api/uploads/route.ts`, `src/app/media/[name]/route.ts`
- Modify: `src/proxy.ts`, `.gitignore`, `.env.example`

**Interfaces:**
- Consumes (Task 1–2): `detectMedia`, `mediaLimitError`, `MAX_AUDIO_BYTES`, `TYPE_MESSAGE`, `isMediaName`, `contentTypeFor`, `parseRange`, `processImage`, `saveUpload`, `uploadDir`.
- Produces:
  - `POST /api/uploads` (form: `file`, `kind`) → `200 { url }` | `4xx/5xx { message }`;
  - `GET /media/<name>` → 200/206/404/416.

Эхлээд `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`-ийг уншиж, route handler-ийн params (Promise) болон Response буцаах хэлбэрийг шалгана.

- [ ] **Step 1: `src/proxy.ts` matcher**

```ts
export const config = {
  // Protect everything except NextAuth routes, uploads (checked in the
  // route — the proxy would cut bodies at 10MB), static assets and files.
  matcher: ["/((?!api/auth|api/uploads|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
```

- [ ] **Step 2: `src/app/api/uploads/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { UserError } from "@/lib/errors";
import { detectMedia, MAX_AUDIO_BYTES, mediaLimitError, TYPE_MESSAGE } from "@/lib/media";
import { processImage, saveUpload } from "@/lib/media-store";
import { isStaff } from "@/lib/types";

/** The largest allowed file plus room for the multipart envelope. */
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 1024 * 1024;

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

export async function POST(req: NextRequest) {
  // This route bypasses the proxy, so it checks the session itself.
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  if (session.user.mustChangePassword) return fail("Эхлээд нууц үгээ солино уу.", 403);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ файл оруулах эрхтэй.", 403);

  if (Number(req.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES) {
    return fail("Файл хэт том байна.", 413);
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || (kind !== "image" && kind !== "audio")) {
    return fail("Хүсэлт буруу байна.", 400);
  }
  const tooBig = mediaLimitError(file.size, kind);
  if (tooBig) return fail(tooBig, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const media = detectMedia(bytes);
  if (!media || media.kind !== kind) return fail(TYPE_MESSAGE[kind], 415);

  try {
    const stored =
      media.kind === "image" ? await processImage(bytes, media.format) : { bytes, ext: media.format };
    const name = await saveUpload(stored.bytes, stored.ext);
    return NextResponse.json({ url: `/media/${name}` });
  } catch (err) {
    if (err instanceof UserError) return fail(err.message, 415);
    console.error("Upload failed:", err);
    return fail("Файл хадгалахад алдаа гарлаа.", 500);
  }
}
```

- [ ] **Step 3: `src/app/media/[name]/route.ts`**

```ts
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { contentTypeFor, isMediaName, parseRange } from "@/lib/media";
import { uploadDir } from "@/lib/media-store";

const notFound = () => new Response("Not found", { status: 404 });

/** Serves uploaded news media; supports one Range so audio can seek. */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // The strict name pattern is also what keeps "../" out of the path.
  if (!isMediaName(name)) return notFound();
  const file = path.join(uploadDir(), name);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) return notFound();

  const size = info.size;
  const headers = new Headers({
    "Content-Type": contentTypeFor(name),
    "Accept-Ranges": "bytes",
    // Names are never reused, so a file never changes.
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  });
  const range = parseRange(req.headers.get("range"), size);
  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  const { start, end } = range ?? { start: 0, end: size - 1 };
  headers.set("Content-Length", String(Math.max(0, end - start + 1)));
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  const body = size === 0 ? null : (Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream);
  return new Response(body, { status: range ? 206 : 200, headers });
}
```

- [ ] **Step 4: `.gitignore` болон `.env.example`**

- `.gitignore`-ийн төгсгөлд нэмэх:

```
# uploaded news media (back up with the database)
/data/
```

- `.env.example`-д `PISTON_URL` мөрийн доор нэмэх:

```
# Where uploaded news images/audio are stored (default: ./data/uploads).
# UPLOAD_DIR="D:/shineue-data/uploads"
```

- [ ] **Step 5: Шалгах**

Run: `npx tsc --noEmit && npx eslint src/app/api/uploads "src/app/media" src/proxy.ts && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: tsc алдаагүй, eslint 0, 142/142.

- [ ] **Step 6: Dev server дээр curl-ээр шалгах**

Proxy matcher өөрчлөгдсөн тул dev server-ийг дахин асаана.

Туршилтын файл бичих:

```bash
node -e "require('fs').mkdirSync('data/uploads',{recursive:true});require('fs').writeFileSync('data/uploads/'+'a'.repeat(24)+'.mp3',Buffer.alloc(1000,7))"
```

Шалгалтууд:
- `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" http://localhost:3001/media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3` → `200 audio/mpeg`
- `curl -s -D - -o /dev/null -H "Range: bytes=0-99" http://localhost:3001/media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3` → `206`, `Content-Range: bytes 0-99/1000`, `Content-Length: 100`
- `curl -s -o /dev/null -w "%{http_code}\n" -H "Range: bytes=5000-" http://localhost:3001/media/aaaaaaaaaaaaaaaaaaaaaaaa.mp3` → `416`
- `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3001/media/..%2F..%2Fpackage.json"` → `404`
- `curl -s -w "\n%{http_code}\n" -F kind=image -F "file=@public/logo.png" http://localhost:3001/api/uploads` → `401 {"message":"Нэвтрээгүй байна."}`

Дараа нь туршилтын файлыг устгана: `rm data/uploads/aaaaaaaaaaaaaaaaaaaaaaaa.mp3`

- [ ] **Step 7: Checkpoint** — Commit хийхгүй.

---

### Task 4: Мэдээний форм

**Files:**
- Create: `src/components/teacher/upload-file.ts`, `src/components/teacher/media-upload-field.tsx`
- Modify: `src/components/teacher/news-form.tsx` (бүхэлд нь), `src/lib/news-actions.ts`, `src/components/news/news-list.tsx`, `README.md`

**Interfaces:**
- Consumes: `MediaKind`, `mediaLimitError`, `isAllowedMediaUrl` (Task 1), `newsExcerpt` (Task 1), `POST /api/uploads` (Task 3).
- Produces: `uploadFile(file, kind, onProgress): Promise<string>`, `MediaUploadField`.

- [ ] **Step 1: `src/components/teacher/upload-file.ts`**

```ts
import type { MediaKind } from "@/lib/media";

/** POSTs one file to /api/uploads and resolves to its /media URL. XHR, for upload progress. */
export function uploadFile(file: File, kind: MediaKind, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const data = xhr.response as { url?: string; message?: string } | null;
      if (xhr.status === 200 && data?.url) resolve(data.url);
      else reject(new Error(data?.message ?? "Файл оруулахад алдаа гарлаа."));
    };
    xhr.onerror = () => reject(new Error("Сервертэй холбогдож чадсангүй."));
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    xhr.send(form);
  });
}

export const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/gif",
  audio: "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg",
};
```

- [ ] **Step 2: `src/components/teacher/media-upload-field.tsx`**

```tsx
"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { mediaLimitError, type MediaKind } from "@/lib/media";
import { ACCEPT, uploadFile } from "@/components/teacher/upload-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A URL field that can also take a file from the computer: the file is
 * uploaded at once and its /media URL fills the field. Controlled, so a
 * failed save (React 19 form reset) does not lose it.
 */
export function MediaUploadField({
  name,
  label,
  kind,
  defaultValue,
  placeholder,
  onBusyChange,
}: {
  name: string;
  label: string;
  kind: MediaKind;
  defaultValue: string;
  placeholder: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const tooBig = mediaLimitError(file.size, kind);
    if (tooBig) {
      setError(tooBig);
      return;
    }
    setError(null);
    setProgress(0);
    onBusyChange(true);
    try {
      setUrl(await uploadFile(file, kind, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Файл оруулахад алдаа гарлаа.");
    } finally {
      setProgress(null);
      onBusyChange(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2">
        <Input id={name} name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={placeholder} />
        <input
          ref={picker}
          type="file"
          accept={ACCEPT[kind]}
          className="hidden"
          aria-label={`${label}: файл сонгох`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" onClick={() => picker.current?.click()} disabled={progress !== null}>
          {progress !== null ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {progress !== null ? `${progress}%` : "Файл сонгох"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {url && (
        <div className="flex items-start gap-2">
          {kind === "image" ? (
            <img src={url} alt="" className="max-h-40 rounded-md border" />
          ) : (
            <audio src={url} controls className="w-full" preload="metadata" />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
            <X className="size-4" />
            Арилгах
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `src/components/teacher/news-form.tsx`-ийг бүхэлд нь солих**

```tsx
"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { saveNews, deleteNews } from "@/lib/news-actions";
import type { ActionState } from "@/lib/teacher-actions";
import { mediaLimitError } from "@/lib/media";
import { MediaUploadField } from "@/components/teacher/media-upload-field";
import { ACCEPT, uploadFile } from "@/components/teacher/upload-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NewsPost } from "@/lib/db/news";

export function NewsForm({ post }: { post: NewsPost | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNews, { error: null });
  // Controlled, so React 19's reset after a failed save keeps the text.
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body_mdx ?? "");
  const [video, setVideo] = useState(post?.video_url ?? "");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [inlineProgress, setInlineProgress] = useState<number | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const uploading = inlineProgress !== null || Object.values(busy).some(Boolean);
  const setFieldBusy = (field: string) => (b: boolean) => setBusy((x) => ({ ...x, [field]: b }));

  /** Uploads an image and puts ![](url) where the cursor was. */
  async function insertImage(file: File) {
    const tooBig = mediaLimitError(file.size, "image");
    if (tooBig) {
      setInlineError(tooBig);
      return;
    }
    const el = bodyRef.current;
    const from = el?.selectionStart ?? body.length;
    const to = el?.selectionEnd ?? body.length;
    setInlineError(null);
    setInlineProgress(0);
    try {
      const url = await uploadFile(file, "image", setInlineProgress);
      const snippet = `\n![](${url})\n`;
      setBody((b) => b.slice(0, Math.min(from, b.length)) + snippet + b.slice(Math.min(to, b.length)));
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "Файл оруулахад алдаа гарлаа.");
    } finally {
      setInlineProgress(null);
    }
  }

  return (
    <form action={action} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Гарчиг</Label>
        <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="body_mdx">Агуулга (Markdown)</Label>
          <input
            ref={picker}
            type="file"
            accept={ACCEPT.image}
            className="hidden"
            aria-label="Агуулгад зураг оруулах: файл сонгох"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void insertImage(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => picker.current?.click()}
            disabled={inlineProgress !== null}
          >
            {inlineProgress !== null ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {inlineProgress !== null ? `${inlineProgress}%` : "Зураг оруулах"}
          </Button>
        </div>
        <Textarea
          ref={bodyRef}
          id="body_mdx"
          name="body_mdx"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-48"
          placeholder={"Мэдээний текст...\n\n**Тод**, жагсаалт, хүснэгт, ![зураг](https://...) бүгд дэмжигдэнэ."}
          required
        />
        {inlineError && <p className="text-xs text-destructive">{inlineError}</p>}
      </div>

      <MediaUploadField
        name="image_url"
        label="Нүүр зураг (заавал биш)"
        kind="image"
        defaultValue={post?.image_url ?? ""}
        placeholder="https://… эсвэл «Файл сонгох»"
        onBusyChange={setFieldBusy("image_url")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="video_url">Видео URL (заавал биш)</Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            YouTube линк тоглуулагч болж суугдана; шууд .mp4 линк ч болно.
          </p>
        </div>
        <MediaUploadField
          name="audio_url"
          label="Дуу (заавал биш)"
          kind="audio"
          defaultValue={post?.audio_url ?? ""}
          placeholder="https://… эсвэл «Файл сонгох»"
          onBusyChange={setFieldBusy("audio_url")}
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {uploading ? "Файл оруулж байна…" : "Нийтлэх"}
        </Button>
        {post && (
          <Button
            type="submit"
            formAction={deleteNews}
            formNoValidate
            variant="destructive"
            onClick={(e) => {
              if (!confirm(`«${post.title}» мэдээг устгах уу?`)) e.preventDefault();
            }}
          >
            <Trash2 className="size-4" />
            Устгах
          </Button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: `src/lib/news-actions.ts`**

- `import { isAllowedMediaUrl } from "@/lib/media";` нэмэх.
- `urlOrNull`-ийг солих:

```ts
/** A web link or one of our /media files; anything else is dropped. */
function urlOrNull(form: FormData, key: string): string | null {
  const v = str(form, key);
  return v && isAllowedMediaUrl(v) ? v : null;
}
```

- [ ] **Step 5: `src/components/news/news-list.tsx`**

- `import { newsExcerpt } from "@/lib/news-text";` нэмэх.
- `{p.body_mdx.replace(/[#*`>\[\]]/g, "").slice(0, 200)}`-ийг `{newsExcerpt(p.body_mdx)}` болгох.

- [ ] **Step 6: README**

"## Контент нэмэх" хэсгийн төгсгөлд нэмэх:

```md
- **Мэдээний зураг, дуу**: `/teacher/news` форм дээр «Файл сонгох» / «Зураг оруулах»-аар оруулна (зураг ≤ 5MB, дуу ≤ 20MB). Зураг WebP болж, GPS/EXIF мэдээлэл нь арилна. Файлууд `data/uploads/` (эсвэл `UPLOAD_DIR`)-д хадгалагдаж `/media/…`-ээр үйлчлэгдэнэ — **энэ хавтсыг өгөгдлийн сантай хамт нөөцөлнө**.
```

- [ ] **Step 7: Шалгах**

Run: `npx tsc --noEmit && npx eslint src/components/teacher src/components/news src/lib && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: tsc алдаагүй, eslint 0 алдаа (өмнөх 2 `_form` анхааруулга), 142/142.

- [ ] **Step 8: Checkpoint** — Commit хийхгүй.

---

### Task 5: Хөтөч дээрх шалгалт ба эцсийн шалгалтууд

Хэрэглэгчийн админ session pane дээр байх ёстой. Байхгүй бол хэрэглэгчээс нэвтрэхийг хүснэ.

Файлыг JS-ээр үүсгэж, `DataTransfer`-аар `<input type=file>`-д оноогоод `change` event үүсгэнэ:
- зураг: `canvas.toBlob(…, "image/jpeg")`;
- дуу: 1 секундийн sine WAV (44-байтын RIFF толгой + 16-бит PCM).

- [ ] **Step 1:** `/teacher/news/new` → нүүр зурагт JPEG оруулна.
  - Явц харагдана.
  - URL `/media/<24>.webp` болно.
  - `<img>` урьдчилан харах хэсэг гарна.
- [ ] **Step 2:** Дууны талбарт WAV оруулна.
  - `<audio>` тоглуулагч гарна.
  - Upload явагдаж байх үед "Нийтлэх" товч идэвхгүй, текст нь "Файл оруулж байна…" байна.
- [ ] **Step 3:** Агуулгад курсор тавиад "Зураг оруулах" дарна. Тэр байрлалд `![](/media/….webp)` мөр орно.
- [ ] **Step 4:** Нийтэлнэ. `/news/<id>` дээр:
  - нүүр зураг, агуулгын зураг, аудио харагдана;
  - `/news` жагсаалтын товч текстэд `![` байхгүй.
- [ ] **Step 5:** `fetch(audioUrl, { headers: { Range: "bytes=0-99" } })` → 206, `content-range` `bytes 0-99/<size>`.
  - Зургийн хариуд `cache-control` нь `immutable`, `x-content-type-options: nosniff` байна.
- [ ] **Step 6:** Татгалзах тохиолдлууд:
  - 6MB JPEG-төст blob: клиент "Зураг 5MB-аас ихгүй байх ёстой." гэж харуулна, шууд fetch хийхэд 413.
  - `.txt` агуулгатай "зураг": 415 "Зөвхөн JPG, PNG, WebP, GIF зураг оруулна.".
  - `credentials: "omit"`-тай fetch: 401.
- [ ] **Step 7:** Шинэ мэдээнд гарчиг болон 5 тэмдэгттэй агуулга оруулж, зураг нэмээд "Нийтлэх" дарна.
  - "Мэдээний агуулга хэт богино байна." гарна.
  - Гарчиг, агуулга, зургийн URL арилахгүй.
- [ ] **Step 8:** Цэвэрлэх:
  - туршилтын мэдээг устгана;
  - `data/uploads/` доторх туршилтын файлуудыг устгана (энэ хавтсанд одоогоор зөвхөн эдгээр байна).
- [ ] **Step 9:** Эцсийн шалгалтууд.

  Run: `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"; npx tsc --noEmit; npm run lint 2>&1 | tail -2; npm run build 2>&1 | grep -E "Compiled|rror"`

  Expected:
  - 142/142
  - tsc алдаагүй
  - lint 0 алдаа
  - build амжилттай
- [ ] **Step 10: Checkpoint** — Commit хийхгүй.
