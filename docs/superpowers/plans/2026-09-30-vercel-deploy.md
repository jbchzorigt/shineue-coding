# Vercel-д гаргах: хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Postgres хувилбарыг хуучин Vercel project-ийн оронд гаргах. Бүтэц: Neon Postgres, Vercel Blob (мэдээний файлууд, браузераас шууд), Piston нь энэ компьютерээс Cloudflare quick tunnel-ээр.

**Architecture:**
- Кодын гурван өөрчлөлт:
  - DB client (`prepare: false`);
  - Blob горимын upload (token route + браузерын `uploadMedia`);
  - `scripts/piston-tunnel.ts`.
- Local горим (Docker Postgres, диск, local Piston) өөрчлөгдөхгүй.
- Үлдсэн нь Vercel CLI-ийн ops алхмууд: link, integration, env, migrate/seed, deploy.

**Tech Stack:** Next.js 16.2, `@vercel/blob` 2.8, Vercel CLI, Neon (Marketplace), cloudflared, tsx.

**Spec:** `docs/superpowers/specs/2026-09-30-vercel-deploy-design.md`

## Global Constraints

- **Git commit/push ХИЙХГҮЙ** ("final code" дүрэм). Deploy нь `vercel deploy`-оор ажлын хуулбараас хийгдэнэ.
- Нууц утгыг (`AUTH_SECRET`, `DATABASE_URL`, token, түр нууц үг) чатад болон tool-ийн гаралтад хэвлэхгүй. `vercel env ls` зөвхөн нэр харуулна.
- Хэрэглэгчийн `.env.local`-ийг дарж бичихгүй. Production утгууд зөвхөн `.env.production.local`-д (gitignore болон vercelignore-д орсон).
- Хэрэглэгчийн бүртгэлд нөөц үүсгэх үйлдлийг (link, integration add, env, deploy) урьдчилан мэдэгдэнэ. Нэвтрэх, нөхцөл зөвшөөрөх, dashboard-ын алхмуудыг хэрэглэгч өөрөө хийнэ.
- Хэрэглэгчид өгөх командууд `npm.cmd` / `vercel.cmd` хэлбэртэй (PowerShell `.ps1` хориотой).
- Upload хязгаар: зураг 5MB, дуу 20MB. Blob pathname: `news/<24 [a-z0-9]>.<webp|jpg|gif|mp3|m4a|wav|ogg>`.

## Review Focus

1. **`/api/uploads/token` proxy-гоос гадуур байна.** Нэвтрээгүй хүн, сурагч, түр нууц үгтэй хэрэглэгч 401/403 авах ёстой. Шалгалт: Task 4, алхам 9.
2. **Браузераас ирсэн файлын төрөл.** Token нь content type-ийг хязгаарлана. Browser талд `detectMedia` шалгана.
3. **`vercel deploy` нууц файл илгээх.** `.vercelignore` нь `.env*` болон `data/`-г хасах ёстой. Шалгалт: Task 4, алхам 7.
4. **Blob store холболт.** `BLOB_READ_WRITE_TOKEN` нэмэхгүй (OIDC) байж болзошгүй. Шалгалт: Task 4, алхам 3.
5. **Tunnel URL өөрчлөгдөх.** Компьютер дахин асахад Python бодлого ажиллахгүй болно. Script нь хэрэглэгчийн нэг командаар сэргэх ёстой (Task 3).

---

### Task 1: Цэвэр функцууд ба DB client

**Files:**
- Create: `src/lib/blob-upload.ts`, `src/lib/blob-upload.test.ts`
- Modify: `src/lib/db/client.ts`

**Produces:** `fitWithin`, `blobPathname`, `BLOB_PATH_RE`, `IMAGE_CONTENT_TYPES`, `AUDIO_CONTENT_TYPES`, `uploadTokenOptions(kind)`, `audioContentType(format)`, `parseUploadPayload(payload)`.

- [ ] **Step 1: Тест бичих** — `src/lib/blob-upload.test.ts`:

```ts
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
```

- [ ] **Step 2: Тест унахыг шалгах**

Run: `npx tsx --test src/lib/blob-upload.test.ts`
Expected: FAIL — `Cannot find module '@/lib/blob-upload'`.

- [ ] **Step 3: `src/lib/blob-upload.ts` бичих**

```ts
/*
 * Vercel Blob uploads of news media (production). Pure helpers shared by
 * the token route and the browser; the local mode keeps /api/uploads.
 */
import { MAX_AUDIO_BYTES, MAX_IMAGE_BYTES, type AudioFormat, type MediaKind } from "@/lib/media";

/** Scales (width, height) down so the long side is at most `max`. */
export function fitWithin(width: number, height: number, max = 1920): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** A fresh news/ path (Blob also appends its own random suffix). Works in the browser and Node. */
export function blobPathname(ext: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `news/${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("")}.${ext}`;
}

export const BLOB_PATH_RE = /^news\/[a-z0-9]{24}\.(webp|jpg|gif|mp3|m4a|wav|ogg)$/;

export const IMAGE_CONTENT_TYPES = ["image/webp", "image/jpeg", "image/gif"];
export const AUDIO_CONTENT_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/ogg"];

/** What a client token may upload, per kind. */
export function uploadTokenOptions(kind: MediaKind) {
  return kind === "image"
    ? { allowedContentTypes: IMAGE_CONTENT_TYPES, maximumSizeInBytes: MAX_IMAGE_BYTES, addRandomSuffix: true }
    : { allowedContentTypes: AUDIO_CONTENT_TYPES, maximumSizeInBytes: MAX_AUDIO_BYTES, addRandomSuffix: true };
}

const AUDIO_TYPE: Record<AudioFormat, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

export function audioContentType(format: AudioFormat): string {
  return AUDIO_TYPE[format];
}

/** The upload() clientPayload is {"kind": "image" | "audio"}; anything else → null. */
export function parseUploadPayload(payload: string | null): MediaKind | null {
  try {
    const kind = (JSON.parse(payload ?? "") as { kind?: unknown } | null)?.kind;
    return kind === "image" || kind === "audio" ? kind : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: DB client** — `src/lib/db/client.ts`-д:

```ts
    // prepare: false — Neon's pooler (PgBouncer) in production; harmless locally.
    const client = postgres(url, { max: 10, prepare: false, onnotice: () => {} });
```

- [ ] **Step 5: Шалгах**

Run: `npx tsx --test src/lib/blob-upload.test.ts && npx tsc --noEmit && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: 5/5, tsc алдаагүй, 149/149.

---

### Task 2: Blob горимын upload (token route + браузер)

**Files:**
- Create: `src/app/api/uploads/token/route.ts`, `.vercelignore`
- Modify:
  - `src/components/teacher/upload-file.ts`
  - `src/components/teacher/media-upload-field.tsx`
  - `src/components/teacher/news-form.tsx`
  - `src/app/teacher/news/[newsId]/page.tsx`
  - `package.json`
  - `README.md`

- [ ] **Step 1:** `npm install @vercel/blob@^2.8.0`. `package.json`-ийн scripts-д нэмэх:

```json
"script:prod": "tsx --env-file=.env.production.local --conditions=react-server",
```

- [ ] **Step 2: `src/app/api/uploads/token/route.ts`**

```ts
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/auth";
import { BLOB_PATH_RE, parseUploadPayload, uploadTokenOptions } from "@/lib/blob-upload";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";

const fail = (message: string, status: number) => NextResponse.json({ message }, { status });

/** Issues short-lived client tokens so the browser uploads news media straight to Vercel Blob. */
export async function POST(req: Request) {
  // Outside the proxy (its matcher skips api/uploads), so check here.
  const session = await auth();
  if (!session?.user?.id) return fail("Нэвтрээгүй байна.", 401);
  if (session.user.mustChangePassword) return fail("Эхлээд нууц үгээ солино уу.", 403);
  const profile = await getUserProfile(session.user.id);
  if (!isStaff(profile?.role)) return fail("Зөвхөн багш/админ файл оруулах эрхтэй.", 403);

  const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
  if (body?.type !== "blob.generate-client-token") return fail("Хүсэлт буруу байна.", 400);
  try {
    const result = await handleUpload({
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const kind = parseUploadPayload(clientPayload);
        if (!kind || !BLOB_PATH_RE.test(pathname)) throw new Error("Хүсэлт буруу байна.");
        return uploadTokenOptions(kind);
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Blob token failed:", err);
    return fail("Хүсэлт буруу байна.", 400);
  }
}
```

- [ ] **Step 3: `src/components/teacher/upload-file.ts`-д нэмэх**

```ts
import { upload } from "@vercel/blob/client";
import { audioContentType, blobPathname, fitWithin } from "@/lib/blob-upload";
import { detectMedia, TYPE_MESSAGE } from "@/lib/media";

export type MediaStore = "local" | "blob";

/**
 * Uploads news media: to /api/uploads (local disk, sharp) or, on Vercel,
 * straight from the browser to Vercel Blob — functions there take at most
 * 4.5MB, so the file must not pass through one.
 */
export async function uploadMedia(
  file: File,
  kind: MediaKind,
  store: MediaStore,
  onProgress: (percent: number) => void
): Promise<string> {
  if (store === "local") return uploadFile(file, kind, onProgress);

  const media = detectMedia(new Uint8Array(await file.slice(0, 16).arrayBuffer()));
  if (!media || media.kind !== kind) throw new Error(TYPE_MESSAGE[kind]);

  let body: Blob = file;
  let ext: string;
  let contentType: string;
  if (media.kind === "audio") {
    ext = media.format;
    contentType = audioContentType(media.format);
  } else if (media.format === "gif") {
    ext = "gif";
    contentType = "image/gif";
  } else {
    const out = await reencodeImage(file);
    body = out.blob;
    ext = out.ext;
    contentType = out.blob.type;
  }

  const result = await upload(blobPathname(ext), body, {
    access: "public",
    handleUploadUrl: "/api/uploads/token",
    clientPayload: JSON.stringify({ kind }),
    contentType,
    multipart: body.size > 4 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  });
  return result.url;
}

/** The browser's stand-in for sharp: orientation applied, ≤1920px, re-encoded — no EXIF survives a canvas. */
async function reencodeImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  const unreadable = new Error("Зургийг уншиж чадсангүй.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw unreadable;
  });
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.82));
  const webp = await encode("image/webp");
  if (webp?.type === "image/webp") return { blob: webp, ext: "webp" };
  // Browsers that cannot encode WebP fall back to JPEG.
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw unreadable;
  return { blob: jpeg, ext: "jpg" };
}
```

- [ ] **Step 4: `store` prop дамжуулах**
  - `media-upload-field.tsx`:
    - `store: MediaStore` prop нэмэх (`import { ACCEPT, uploadMedia, type MediaStore } from "@/components/teacher/upload-file";`);
    - `uploadFile(file, kind, setProgress)`-ийг `uploadMedia(file, kind, store, setProgress)` болгох.
  - `news-form.tsx`:
    - `NewsForm({ post, store }: { post: NewsPost | null; store: MediaStore })`;
    - `insertImage` доторх `uploadFile(file, "image", …)`-ийг `uploadMedia(file, "image", store, …)` болгох;
    - хоёр `MediaUploadField`-д `store={store}` нэмэх.
  - `src/app/teacher/news/[newsId]/page.tsx`:
    - `<NewsForm post={post} />`-ийг дараахаар солих:

      ```tsx
      <NewsForm post={post} store={process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local"} />
      ```

    - Дээр нь тайлбар нэмэх: `{/* Vercel (no writable disk) stores news media in Blob. */}`

- [ ] **Step 5: `.vercelignore`**

```
# never upload secrets, local uploads or tooling state
.env*
!.env.example
data
.superpowers
docker
.next
node_modules
```

- [ ] **Step 6: README** — "## Production" хэсгийн өмнө шинэ хэсэг нэмэх:

````md
## Vercel (үүлэн хувилбар)

- DB: Neon (Vercel Marketplace), мэдээний файлууд: Vercel Blob (браузераас шууд), Python: энэ компьютерийн Piston ← Cloudflare quick tunnel.
- Компьютер дахин асах бүрд (Docker, cloudflared суусан байх):

  ```bash
  npm.cmd run script -- scripts/piston-tunnel.ts
  ```

  Tunnel нээж, Vercel-ийн `PISTON_URL`-ийг шинэчлээд production-ийг дахин deploy хийнэ.
- Production DB-д script ажиллуулах: `vercel env pull .env.production.local --environment=production`, дараа нь `npm.cmd run script:prod -- scripts/<нэр>.ts`.
- Deploy: `vercel deploy --prod` (`.vercelignore` нь `.env*`, `data/`-г илгээхгүй).
````

- [ ] **Step 7: Шалгах**

Run: `npx tsc --noEmit && npx eslint src/app/api/uploads src/components/teacher src/lib && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"`
Expected: алдаагүй, 149/149.

Мөн local горимд (`BLOB_READ_WRITE_TOKEN` байхгүй) мэдээний формоор нэг зураг upload хийхэд `/media/…webp` хэвээр гарахыг хөтөч дээр шалгана. Дараа нь файлыг устгана.

---

### Task 3: Piston tunnel script

**Files:** Create `scripts/piston-tunnel.ts`.

- [ ] **Step 1: Script бичих**

```ts
/**
 * Opens a Cloudflare quick tunnel to the local Piston, points the Vercel
 * production PISTON_URL at it and redeploys. Run after every reboot:
 *   npm.cmd run script -- scripts/piston-tunnel.ts
 * Needs: Docker (coding-piston), cloudflared, and a logged-in, linked Vercel CLI.
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, openSync, readFileSync } from "node:fs";
import path from "node:path";

const PISTON = "http://localhost:2000";
const LOG = path.join(process.cwd(), "data", "cloudflared.log");
const WIN = process.platform === "win32";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Node refuses to spawn .cmd files without a shell; the arguments here are constants. */
function vercel(args: string[], input?: string) {
  execFileSync(WIN ? "vercel.cmd" : "vercel", args, {
    shell: WIN,
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "inherit", "inherit"],
  });
}

async function pistonReady(): Promise<boolean> {
  try {
    const res = await fetch(`${PISTON}/api/v2/runtimes`);
    return res.ok && (await res.text()).includes("python");
  } catch {
    return false;
  }
}

async function main() {
  console.log("1/5 Локал Piston шалгаж байна…");
  if (!(await pistonReady())) {
    execFileSync("docker", ["start", "coding-piston"], { stdio: "inherit" });
    for (let i = 0; i < 60 && !(await pistonReady()); i++) await sleep(2000);
    if (!(await pistonReady())) throw new Error("Piston асахгүй байна. `npm.cmd run db:up`-ийг шалгана уу.");
  }

  console.log("2/5 Хуучин tunnel-ийг зогсоож байна…");
  try {
    execFileSync(WIN ? "taskkill" : "pkill", WIN ? ["/IM", "cloudflared.exe", "/F"] : ["-f", "cloudflared tunnel"], {
      stdio: "ignore",
    });
  } catch {
    // none was running
  }

  console.log("3/5 Шинэ tunnel асааж байна…");
  mkdirSync(path.dirname(LOG), { recursive: true });
  const out = openSync(LOG, "w");
  spawn("cloudflared", ["tunnel", "--url", PISTON], {
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
  }).unref();
  let url: string | undefined;
  for (let i = 0; i < 60 && !url; i++) {
    await sleep(1000);
    url = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(readFileSync(LOG, "utf8"))?.[0];
  }
  if (!url) throw new Error(`Tunnel-ийн хаяг гарсангүй. ${LOG}-ийг шалгана уу.`);
  console.log(`    ${url}`);

  console.log("4/5 Vercel-ийн PISTON_URL-ийг шинэчилж байна…");
  try {
    vercel(["env", "rm", "PISTON_URL", "production", "--yes"]);
  } catch {
    // not set yet
  }
  vercel(["env", "add", "PISTON_URL", "production"], `${url}/api/v2`);

  console.log("5/5 Production deploy хийж байна (1–3 минут)…");
  vercel(["deploy", "--prod", "--yes"]);
  console.log("Дууслаа. Сайт дээр Python бодлого илгээж шалгаарай.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Шалгах:** `npx tsc --noEmit` алдаагүй, `npx eslint scripts/piston-tunnel.ts` 0.

  Бодит ажиллуулалт нь Task 4, алхам 6 (Vercel CLI болон cloudflared хэрэгтэй).

---

### Task 4: Байршуулах ба production шалгалт

Алхам бүр гадны нөөцөд нөлөөлнө. Эхлэхээс өмнө хэрэглэгчид жагсааж мэдэгдэнэ.

- [ ] **Step 1: Бэлтгэл (хэрэглэгч)**
  - `vercel.cmd whoami` → нэвтэрсэн байх;
  - `cloudflared --version` ажиллах.

  Аль нэг нь үгүй бол хэрэглэгчээс суулгах/нэвтрэхийг хүсээд хүлээнэ.
- [ ] **Step 2: Project холбох**
  - `vercel.cmd projects ls`-ээр хуучин project-ийн нэрийг олж, хэрэглэгчээр баталгаажуулна.
  - `vercel.cmd link --yes --project <нэр>` ажиллуулна.
  - `vercel.cmd env ls production` (зөвхөн нэр)-ээр хуучин Firebase/Google хувьсагчуудыг жагсааж, хэрэглэгчийн зөвшөөрлөөр `vercel env rm`-ээр устгана.
- [ ] **Step 3: Neon + Blob**
  - Neon: `vercel.cmd integration add neon`. Dashboard/нөхцөл шаардвал хэрэглэгчээр хийлгэнэ.
  - Blob: public store үүсгэж project-т холбоно (`vercel.cmd blob --help`-ээр командыг тодорхойлно).
  - `vercel.cmd env ls production`-д `DATABASE_URL` болон `BLOB_READ_WRITE_TOKEN` байгааг шалгана.
    - `BLOB_READ_WRITE_TOKEN` байхгүй бол (OIDC горим) зогсоож, хэрэглэгчээс dashboard-ын Blob store → "Read-Write Token"-ийг project-т холбохыг хүснэ.
    - `handleUpload` зөвхөн энэ token-оор ажилладаг.
- [ ] **Step 4: Нууц утгууд**
  - `AUTH_SECRET`: Node-оор санамсаргүй утга үүсгэж, stdin-ээр `vercel env add AUTH_SECRET production` руу шууд дамжуулна. Утга хэвлэгдэхгүй.
  - `AUTH_TRUST_HOST` = `true`.
- [ ] **Step 5: DB бэлтгэх**
  - `vercel.cmd env pull .env.production.local --environment=production --yes`
  - Дараа нь:

    ```bash
    npx tsx --env-file=.env.production.local scripts/migrate.ts
    npm run script:prod -- scripts/import-content.ts
    npm run script:prod -- scripts/seed-challenges.ts
    npm run script:prod -- scripts/seed-data-analyst.ts
    npm run script:prod -- scripts/seed-logic.ts
    ```

  - Хэрэглэгч `npm.cmd run script:prod -- scripts/create-admin.ts`-аар production админ үүсгэнэ. Түр нууц үг зөвхөн түүний терминалд гарна.
- [ ] **Step 6: Tunnel + deploy:** `npm run script -- scripts/piston-tunnel.ts`
  - Deploy амжилттай болж, production URL гарна.
- [ ] **Step 7: Нууц файл илгээгдээгүйг шалгах**
  - `vercel.cmd inspect <deployment> --logs` эсвэл deployment-ийн source жагсаалтад `.env.local`, `.env.production.local`, `data/` байхгүй.
  - Хамгийн багадаа `https://<url>/.env.local` → 404.
- [ ] **Step 8: Нэвтрэлт (хэрэглэгч):** Хэрэглэгч pane дээр production URL-д админаар нэвтэрч, нууц үгээ тохируулна.
- [ ] **Step 9: Production шалгалт** (хэрэглэгчийн session)
  1. Нүүр хуудас, лого, `/modules`-т 7 модуль.
  2. `ch-logic-01`-ийг API-аар илгээхэд 4/4 гарна. Дараа нь admin-ий submissions болон XP-г Neon дээр цэвэрлэнэ.
  3. `ch-01-sum`-д зөв код илгээхэд Piston-оор (tunnel) шалгагдана.
  4. Мэдээний форм дээр 2400×1600 JPEG ба 6MB WAV оруулна:
     - URL `https://…blob.vercel-storage.com/news/…` байна;
     - зураг 1920 өргөнтэй;
     - дуу тоглоно.
  5. Нэвтрээгүй `POST /api/uploads/token` хүсэлт 401 буцаана.
  6. Туршилтын мэдээ болон Blob файлуудыг устгана.
- [ ] **Step 10: Эцсийн шалгалтууд (local):** `npm test`, `tsc`, `lint`, `npm run build` бүгд цэвэр.
