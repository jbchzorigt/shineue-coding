# Vercel-д гаргах (Neon + Vercel Blob + Piston tunnel)

Огноо: 2026-09-30
Төлөв: Дизайн батлагдсан, spec хянагдаж байна
Өмнөх ажил: `2026-09-30-news-media-upload-design.md` (дууссан)

## Зорилго

Postgres-т шилжсэн шинэ хувилбарыг Vercel дээрх хуучин project-ийн оронд гаргах. Ингэснээр сайт үүлэнд ажиллаж,
энэ компьютер унтарсан ч нээгдэнэ. Зөвхөн Python ажиллуулах хэсэг энэ компьютерийн Piston-оос хамаарна.

### Хэрэглэгчийн шийдвэрүүд

- **Vercel (бүрэн үүлэнд):**
  - Neon Postgres (Vercel Marketplace);
  - Vercel Blob (мэдээний файлууд);
  - Piston нь энэ компьютерээс Cloudflare quick tunnel-ээр.
- Firestore хувилбартай **хуучин Vercel project-ийг солино**. Хуучин Firestore өгөгдлийг шилжүүлэхгүй ("шинээр эхэлнэ").
- Local хөгжүүлэлт одоогийнх хэвээр: Docker Postgres, `data/uploads`, local Piston.

### Хүрээнээс гадуур

- Piston-ийг Vercel Sandbox руу шилжүүлэх.
- Нэрлэсэн tunnel болон Cloudflare Access (домайн авсны дараа).
- Local өгөгдлийг Neon руу хуулах. Production шинэ хоосон DB-ээр эхэлж, контентыг seed-ээр оруулна.
- Blob-ийн ашиглагдаагүй файл цэвэрлэх.
- Custom домайн.

### Амжилтын шалгуур

1. `https://<project>.vercel.app` дээр шинэ хувилбар нээгдэж, `/login` дээр админаар нэвтэрнэ.
2. Модулиуд, бодлогууд (Gate бодлого орно) Neon-оос уншигдана. Gate бодлого илгээхэд XP авна.
3. Python бодлого илгээхэд энэ компьютерийн Piston-оор шалгагдана (tunnel ажиллаж байх үед).
4. Мэдээнд зураг, дуу оруулахад файл Vercel Blob руу хадгалагдаж, мэдээнд харагдана.
   - 4.5MB-аас том файл ч амжина.
   - Зургийн EXIF/GPS арилна.
5. Local дээр `npm test`, `tsc`, `lint`, `next build` амжилттай. Local горимын upload өөрчлөгдөхгүй.
6. `.env.local` production руу илгээгдэхгүй.

## 1. Орчин ба нууц мэдээлэл

| Хувьсагч | Local | Production (Vercel) |
|---|---|---|
| `DATABASE_URL` | Docker Postgres | Neon (pooled), Marketplace автоматаар нэмнэ |
| `BLOB_READ_WRITE_TOKEN` | байхгүй → диск горим | Blob store холбоход автоматаар нэмэгдэнэ |
| `AUTH_SECRET` | одоогийнх | **шинэ** санамсаргүй утга (`openssl rand -base64 32`-тэй тэнцэх) |
| `AUTH_TRUST_HOST` | `true` | `true` |
| `PISTON_URL` | `http://localhost:2000/api/v2` | `https://<tunnel>.trycloudflare.com/api/v2` |
| `SUPER_ADMIN_EMAIL` | анхдагч | анхдагч (тохируулахгүй) |

- Хуучин project-ийн Firebase хувьсагчуудыг (`FIREBASE_*` г.м.) устгана.
- Нууц утгыг чатад хэзээ ч бичихгүй.
- Production-ий утгуудыг `vercel env pull .env.production.local --environment=production`-оор тусдаа файлд татна. Энэ нь `.env.local`-ийг дарж бичихгүй.
  Migration болон seed script-ийг тэр файлаар ажиллуулна (`tsx --env-file=.env.production.local`).

## 2. Кодын өөрчлөлт

### 2.1 DB холболт (`src/lib/db/client.ts`)

- `postgres(url, { max: 10, prepare: false, onnotice })`. Neon-ий pooler (PgBouncer) болон local орчны аль алинд ажиллана.
- URL-ийн `sslmode=require`-ийг postgres-js өөрөө хүндэтгэдэг.

### 2.2 Мэдээний upload — Blob горим

- **Горим сонгох:** Мэдээний хуудсууд (`/teacher/news/new`, `/teacher/news/[newsId]`) нь `store = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local"`
  утгыг `NewsForm` → `MediaUploadField` рүү дамжуулна.
- **`src/lib/blob-upload.ts`** (цэвэр функцууд, тестлэгдэнэ):
  - `fitWithin(w, h, max = 1920)`: харьцааг хадгалан багасгасан хэмжээ.
  - `blobPathname(ext)`: `news/<24 тэмдэгт>.<ext>`.
  - `uploadTokenOptions(kind)`: `{ allowedContentTypes, maximumSizeInBytes, addRandomSuffix: true }`.
    - Зураг: `image/webp`, `image/jpeg`, `image/gif`, 5MB.
    - Дуу: `audio/mpeg`, `audio/mp4`, `audio/x-m4a`, `audio/wav`, `audio/x-wav`, `audio/ogg`, 20MB.
  - `audioContentType(format)`.
- **`POST /api/uploads/token`** (`handleUpload`):
  - Proxy matcher-ийн `api/uploads` тохиргоо энэ route-д ч хамаарах тул эрхийг өөрөө шалгана. Энэ нь `/api/uploads`-ийн шалгалттай адил: 401, түр нууц үг бол 403, staff биш бол 403.
  - `clientPayload` нь `{"kind":"image"|"audio"}` байх ёстой.
  - `pathname` нь `/^news\/[a-z0-9]{24}\.(webp|jpg|gif|mp3|m4a|wav|ogg)$/` загварт тохирох ёстой. Эс бөгөөс 400.
  - `onUploadCompleted` ашиглахгүй (callback хэрэггүй).
- **Браузер дахь боловсруулалт** (`src/components/teacher/upload-file.ts`-ийн `uploadMedia(file, kind, store, onProgress)`):
  - `local`: одоогийн XHR → `/api/uploads`.
  - `blob` + зураг:
    - GIF биш бол `createImageBitmap(file, { imageOrientation: "from-image" })` → `fitWithin` → canvas → `toBlob("image/webp", 0.82)`.
      Хөтөч WebP үүсгэж чадахгүй бол JPEG болгоно. Canvas EXIF хуулдаггүй тул GPS мэдээлэл арилна.
    - GIF-ийг өөрчлөхгүй.
    - Эхний байтыг `detectMedia`-гаар шалгана.
  - `blob` + дуу: `detectMedia`-аар эхний 16 байтыг шалгана. Буруу бол `TYPE_MESSAGE`.
  - `upload(blobPathname(ext), body, { access: "public", handleUploadUrl: "/api/uploads/token", clientPayload, contentType, multipart: size > 4MB, onUploadProgress })`.
  - Буцах утга нь `blob.url` (`https://…public.blob.vercel-storage.com/news/…`). `isAllowedMediaUrl` үүнийг https гэж хүлээн авна.
- Хэмжээний урьдчилсан шалгалт (`mediaLimitError`) хоёр горимд хоёуланд нь хэвээр.

### 2.3 `.vercelignore`

`.env*` (`.env.example`-ээс бусад), `data/`, `.superpowers/`, `docker/`, `.next/`, `node_modules/`.

### 2.4 Piston tunnel script (`scripts/piston-tunnel.ts`)

`npm.cmd run script -- scripts/piston-tunnel.ts`-аар ажиллана.
1. `http://localhost:2000/api/v2/runtimes` Python-г буцаахгүй бол `docker start coding-piston` хийж, бэлэн болтол хүлээнэ.
2. Өмнөх `cloudflared` процессыг зогсооно.
3. `cloudflared tunnel --url http://localhost:2000`-ийг салангид (detached) асааж, log-оос `https://*.trycloudflare.com` хаягийг уншина.
4. `vercel env rm PISTON_URL production --yes`, дараа нь шинэ хаяг + `/api/v2`-ийг `vercel env add PISTON_URL production` руу stdin-ээр өгнө.
5. `vercel deploy --prod --yes`.

Алхам бүр монгол тайлбар хэвлэнэ. Алдаа гарвал тодорхой мессежтэй зогсоно.

## 3. Байршуулах (ops)

**Хэрэглэгчийн хийх зүйл** (нэвтрэлт, суулгалт):
1. `npm.cmd i -g vercel`, дараа нь `vercel login`.
2. `winget install Cloudflare.cloudflared`.
3. Шаардлагатай бол Neon/Blob-ийн нөхцөлийг dashboard дээр зөвшөөрөх.

**Агентийн хийх зүйл** (хэрэглэгчийн зөвшөөрлөөр, алхам бүрийг мэдэгдэнэ):
1. `vercel link`-ээр хуучин project-ийг сонгоно. Нэрийг хэрэглэгчтэй баталгаажуулна.
2. `vercel integration add neon`. Blob store үүсгэж project-т холбоно (public).
3. `AUTH_SECRET` (шинэ), `AUTH_TRUST_HOST=true`-ийг production-д нэмнэ. Хуучин Firebase хувьсагчуудыг жагсааж, хэрэглэгчээр баталгаажуулаад устгана.
4. `vercel env pull .env.production.local --environment=production` → migration (`scripts/migrate.ts`) → `db:seed`-ийн script-ууд Neon руу.
5. Хэрэглэгч `npm.cmd run script:prod -- scripts/create-admin.ts`-аар production админ үүсгэнэ. Түр нууц үг зөвхөн түүний терминалд гарна.
   `script:prod` нь `tsx --env-file=.env.production.local --conditions=react-server` байна.
6. `scripts/piston-tunnel.ts` ажиллуулна. Энэ нь `PISTON_URL` тохируулаад production deploy хийнэ.
7. Хэрэглэгч production сайт дээр нэвтэрсний дараа агент шалгалт хийнэ (§4).

## 4. Тест

- **Unit** (`src/lib/blob-upload.test.ts`):
  - `fitWithin`: 3000×2000 → 1920×1280; 1000×3000 → 640×1920; жижиг хэмжээ өөрчлөгдөхгүй.
  - `blobPathname`-ийн хэлбэр.
  - `uploadTokenOptions`: төрөл, хэмжээ, `addRandomSuffix`.
  - `audioContentType`.
  - Token route-ийн pathname загвар.
- **DB client:** Одоогийн 144 тест `prepare: false`-тэй ажиллана.
- **Local:** Upload local горимоор хэвээр ажиллана (браузер дээр түргэн шалгалт).
- **Production** (хэрэглэгч нэвтэрсний дараа):
  1. нүүр хуудас, лого, `/modules`, 7 модуль;
  2. ch-logic-01 Gate бодлого илгээх;
  3. Python ch-01-sum ажиллуулах (tunnel);
  4. мэдээнд 5MB орчим JPEG (EXIF-тэй) болон 6MB-аас том MP3/WAV оруулах: Blob URL, зураг ≤1920, EXIF-гүй;
  5. нэвтрээгүй token хүсэлт → 401;
  6. туршилтын мэдээ, файл, XP-г цэвэрлэх.

## 5. Өөрчлөгдөх файлууд

- **Шинэ:**
  - `src/lib/blob-upload.ts` (+ тест)
  - `src/app/api/uploads/token/route.ts`
  - `scripts/piston-tunnel.ts`
  - `.vercelignore`
- **Өөрчлөгдөх:**
  - `src/lib/db/client.ts` (`prepare: false`)
  - `src/components/teacher/upload-file.ts` (`uploadMedia`)
  - `media-upload-field.tsx`, `news-form.tsx` (`store` prop)
  - `src/app/teacher/news/new/page.tsx`, `src/app/teacher/news/[newsId]/page.tsx`
  - `package.json` (`@vercel/blob`, `script:prod`)
  - `.gitignore` (`.env.production.local` нь `.env*`-д аль хэдийн орсон, шалгана)
  - `README.md` (Vercel хэсэг)
