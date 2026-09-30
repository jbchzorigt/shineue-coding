# Мэдээнд зураг, дуу оруулах (файл upload)

Огноо: 2026-09-30
Төлөв: Дизайн батлагдсан, spec хянагдаж байна
Өмнөх ажил: `2026-09-29-logic-gates-design.md` (дууссан)

## Зорилго

Багш, админ мэдээнд зураг болон дууг **компьютерээсээ файлаар** оруулдаг болгох. Одоо эдгээрийг зөвхөн
интернэт дэх URL-аар оруулж болдог. Файл энэ сервер дээр (сургуулийн компьютер) хадгалагдана.

### Хэрэглэгчийн шийдвэрүүд

- Компьютерээс файл сонгож оруулна. URL-аар оруулах одоогийн боломж хэвээр үлдэнэ.
- Нэг **нүүр зураг** болон агуулга дотор **хэдэн ч зураг** оруулж болно.
- Нэг **дуу** (одоогийн `audio_url`).
- Хэмжээний хязгаар: **зураг 5MB, дуу 20MB**.
- Техникийн арга "A": тусдаа upload route, файлыг дискэнд хадгалах, `GET /media/…`-ээр хүргэх.

### Хүрээнээс гадуур

- Ашиглагдаагүй (orphan) файлыг цэвэрлэх. Мэдээ устгах эсвэл зураг солиход хуучин файл дискэнд үлдэнэ.
- Дууг хөрвүүлэх, видео upload (видео нь YouTube/URL хэвээр).
- Хөтөч дээр микрофоноор бичлэг хийх.
- Мэдээнээс бусад хэсэгт (бодлого, хичээл) upload хийх.
- Нөөцлөлт. `data/uploads/`-ийг серверийн тохиргооны ажлын нөөцлөлтөд нэмнэ.

### Амжилтын шалгуур

1. Багш мэдээний форм дээр зураг болон дуу сонгоход upload болж, явц хувиар харагдана. Дуусмагц урьдчилан харах хэсэг гарна.
2. "Зураг оруулах" товч нь агуулгын курсорын байрлалд зураг оруулна. Нийтлэгдсэн мэдээнд зураг харагдана.
3. Утасны GPS/EXIF мэдээлэлтэй зураг хадгалагдахдаа мэдээлэлгүй WebP болж, 1920px-ээс томгүй болно.
4. Аудиог дундаас гүйлгэж сонсож болно (Range, 206).
5. 5MB-аас том зураг, 20MB-аас том дуу, дэмжигдээгүй төрөл (SVG, текст, exe) тодорхой монгол алдаагаар татгалзагдана.
6. Нэвтрээгүй хүн болон сурагч upload хийж чадахгүй (401/403).
7. Мэдээ хадгалахад алдаа гарвал гарчиг, агуулга арилахгүй.
8. `npm test`, `tsc`, `lint` (алдаа 0), `next build` бүгд амжилттай. Хөтөч дээрх гар шалгалт (§6) давсан байна.

## 1. Хадгалах газар

- Хавтас: `UPLOAD_DIR` орчны хувьсагч. Байхгүй бол `<төслийн үндэс>/data/uploads`. Эхний upload-ын үед үүснэ.
- `.gitignore`-д `/data/` нэмнэ. `.env.example`-д `UPLOAD_DIR`-ийг тайлбартай нэмнэ.
- Файлын нэр: 24 тэмдэгттэй санамсаргүй `[a-z0-9]` id + өргөтгөл (`webp | gif | mp3 | m4a | wav | ogg`).
  Файлыг `wx` flag-аар бичнэ (дарж бичихгүй).
- URL: `/media/<нэр>`.

## 2. `src/lib/media.ts` (цэвэр функцууд, тестлэгдэнэ)

| Экспорт | Үүрэг |
|---|---|
| `MAX_IMAGE_BYTES = 5 MiB`, `MAX_AUDIO_BYTES = 20 MiB` | Хязгаарууд |
| `detectMedia(bytes): { kind: "image" \| "audio"; format } \| null` | Эхний байтаар төрөл тодорхойлох |
| `MEDIA_NAME_RE`, `isMediaName(name)` | `/^[a-z0-9]{24}\.(webp\|gif\|mp3\|m4a\|wav\|ogg)$/` |
| `contentTypeFor(name)` | `image/webp`, `image/gif`, `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/ogg` |
| `parseRange(header, size)` | `{ start, end } \| "invalid" \| null` (null = Range байхгүй) |
| `isAllowedMediaUrl(url)` | `http(s)://…` эсвэл `/media/<зөв нэр>` |

**Magic bytes:**

| Формат | Шалгалт |
|---|---|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |
| GIF | `GIF87a` / `GIF89a` |
| WebP | `RIFF` …(4)… `WEBP` |
| MP3 | `ID3`, эсвэл frame sync: `FF`, дараагийн байт `& 0xE0 === 0xE0` |
| M4A | 4-р байтаас `ftyp` (brand-ыг шалгахгүй; MP4 видео ирвэл `<audio>` зөвхөн дууг нь тоглуулна) |
| WAV | `RIFF` …(4)… `WAVE` |
| OGG | `OggS` |

SVG болон бусад бүх төрөл дэмжигдэхгүй (SVG дотор script байж болно).

**`parseRange`:** `bytes=a-b`, `bytes=a-`, `bytes=-n` (сүүлийн n байт) хэлбэрийг дэмжинэ, нэг л range.
`a > b`, `a ≥ size` эсвэл формат буруу бол `"invalid"` (→ 416). `b ≥ size` бол `size-1` болгож тайрна.

## 3. `src/lib/media-store.ts` (server-only)

- `processImage(bytes): Promise<{ bytes; ext }>`:
  - GIF бол `sharp(bytes, { animated: true })`-аар хөдөлгөөнийг хадгалж, GIF хэвээр үлдээнэ.
  - Бусад нь `.rotate()` (EXIF-ийн дагуу эргүүлнэ), `.resize(1920, 1920, { fit: "inside", withoutEnlargement: true })`,
    `.webp({ quality: 82 })`.
  - Metadata хуулахгүй (sharp анхдагчаар EXIF-гүй бичдэг).
  - Задрахгүй зураг бол `UserError("Зургийг уншиж чадсангүй.")`.
- `saveUpload(bytes, ext, dir = uploadDir()): Promise<string>`: хавтас үүсгэж, шинэ нэрээр бичээд нэрийг буцаана.
- `uploadDir()`: `process.env.UPLOAD_DIR` эсвэл `path.join(process.cwd(), "data", "uploads")`.
- `sharp`-ийг `package.json`-д шууд dependency болгоно (одоо Next-ийн optional dependency болж суусан).

## 4. Route-ууд

### 4.1 `POST /api/uploads` (`src/app/api/uploads/route.ts`)

- `src/proxy.ts`-ийн matcher-ээс `api/uploads`-ийг хасна. Эс бөгөөс proxy body-г 10MB-аар тасална.
- Эрхийн шалгалт:
  - `auth()` → session байхгүй бол 401 "Нэвтрээгүй байна.";
  - `session.user.mustChangePassword` бол 403;
  - DB-ийн role staff биш бол 403 "Зөвхөн багш/админ файл оруулах эрхтэй.".
- `Content-Length` > 21MB бол `formData()` уншихаас өмнө 413 буцаана.
- `form.get("file")` нь File, `form.get("kind")` нь `image` | `audio` байх ёстой. Эс бөгөөс 400.
- Шалгалтын дараалал:
  1. Хэмжээ хязгаараас хэтэрвэл 413 "Зураг 5MB-аас ихгүй байх ёстой." эсвэл "Дуу 20MB-аас ихгүй байх ёстой.".
  2. `detectMedia(bytes)`. `null` эсвэл `kind` таарахгүй бол 415 "Зөвхөн JPG, PNG, WebP, GIF зураг оруулна." эсвэл
     "Зөвхөн MP3, M4A, WAV, OGG дуу оруулна.".
- Зургийг `processImage`, дууг шууд `saveUpload` → 200 `{ url: "/media/<нэр>" }`.
- Гэнэтийн алдаа гарвал log бичээд 500 "Файл хадгалахад алдаа гарлаа.".

### 4.2 `GET /media/[name]` (`src/app/media/[name]/route.ts`)

- `isMediaName(name)` биш бол 404. Файл байхгүй бол 404.
- `Range` толгой байхгүй бол 200 бүтэн файл. Байвал:
  - `parseRange` зөв бол 206 + `Content-Range: bytes a-b/size`;
  - `"invalid"` бол 416 + `Content-Range: bytes */size`.
- Толгойнууд:
  - `Content-Type`
  - `Content-Length`
  - `Accept-Ranges: bytes`
  - `Cache-Control: public, max-age=31536000, immutable`
  - `X-Content-Type-Options: nosniff`
- Файлыг `fs.createReadStream(path, { start, end })` → `Readable.toWeb` хэлбэрээр stream хийнэ.
- `/media/x.webp` зам цэгтэй өргөтгөлтэй тул proxy matcher-т аль хэдийн ордоггүй, нийтэд нээлттэй.

## 5. Форм

- **`src/components/teacher/media-upload-field.tsx`** (client): `{ name, label, kind, defaultValue, onBusyChange }`.
  - Controlled URL талбар (`name`-тэй тул формоор илгээгдэнэ).
  - Нуугдмал `<input type="file" accept>` болон "Файл сонгох" товч.
  - XHR-ээр `POST /api/uploads` илгээж, явцыг хувиар харуулна.
  - Амжилттай бол URL-ийг бөглөж, урьдчилан харах хэсэг гаргана (зураг: жижиг `<img>`, дуу: `<audio controls>`). "Арилгах" товчтой.
  - Алдааны мессежийг талбарын доор харуулна.
- **Агуулгын "Зураг оруулах" товч:** Textarea-ийн дээр байрлана. Upload хийгээд `textarea.setRangeText("\n![](url)\n", …)`-ээр
  курсорын байрлалд оруулна.
- **`news-form.tsx`:**
  - Нүүр зураг болон дууны талбарыг `MediaUploadField` болгоно. Видео URL хэвээр.
  - Гарчиг, агуулга controlled state болно, тул алдааны дараа React 19-ийн form reset тэдгээрийг арилгахгүй.
  - Upload явагдаж байхад "Нийтлэх" товч идэвхгүй болно.
- **`saveNews`:** `urlOrNull` нь `isAllowedMediaUrl`-ийг ашиглана (`/media/<нэр>` болон http(s)).
- **Жагсаалтын товч текст (`news-list.tsx`):** `![...](...)` зургийн мөрийг бүхэлд нь хасаад, дараа нь одоогийн тэмдэгтүүдийг хасна.

## 6. Тест

**Unit (`node:test`):**
- `src/lib/media.test.ts`:
  - `detectMedia`: 8 формат, текст, `MZ` (exe), `<svg`, хоосон буфер;
  - `parseRange`: `bytes=0-99`, `bytes=100-`, `bytes=-500`, `bytes=5-2`, `bytes=size-`, `bytes=x`, олон range, `b ≥ size` тайрах, header байхгүй;
  - `isMediaName`: зөв нэр, `../x.mp3`, том үсэг, өөр өргөтгөл;
  - `isAllowedMediaUrl`: https, http, `/media/<нэр>`, `javascript:`, `//evil.com/x`, `/media/../x`, `data:`;
  - `contentTypeFor`.
- `src/lib/media-store.test.ts`:
  - GPS EXIF-тэй 3000×2000 JPEG → WebP, өргөн ≤ 1920, `metadata().exif` байхгүй;
  - хөдөлгөөнт GIF → GIF хэвээр, олон frame;
  - эвдэрсэн зураг → `UserError`;
  - `saveUpload`: түр хавтсанд бичих, нэр `MEDIA_NAME_RE`-д тохирох, хоёр дуудлага өөр нэр.

**Хөтөч дээр** (админ session, pane):
1. Мэдээний форм дээр JS/DataTransfer-ээр зураг сонгоход явц харагдаж, URL `/media/….webp` болж, урьдчилан харах хэсэг гарна.
2. Дуу (mp3) оруулахад `<audio>` тоглуулагч гарна.
3. Агуулгад "Зураг оруулах" дарахад курсорын байрлалд `![](/media/…)` орно.
4. Нийтлэхэд `/news/<id>` дээр нүүр зураг, агуулгын зураг, аудио харагдана.
5. `Range: bytes=0-99`-тэй fetch → 206, `Content-Range` зөв.
6. 6MB зураг → 413 мессеж. `.txt` → 415 мессеж. Нэвтрээгүй fetch → 401.
7. Агуулга хэт богино үед хадгалахад алдаа гарч, бичсэн текст үлдэнэ.
8. Жагсаалтын товч текстэд `![](…)` харагдахгүй.
9. Туршилтын мэдээ болон файлуудыг устгана.

## 7. Өөрчлөгдөх файлууд

- **Шинэ:**
  - `src/lib/media.ts`, `src/lib/media-store.ts` болон тестүүд
  - `src/app/api/uploads/route.ts`
  - `src/app/media/[name]/route.ts`
  - `src/components/teacher/media-upload-field.tsx`
- **Өөрчлөгдөх:**
  - `src/proxy.ts` (matcher)
  - `src/lib/news-actions.ts` (URL шалгалт)
  - `src/components/teacher/news-form.tsx`
  - `src/components/news/news-list.tsx` (товч текст)
  - `package.json` (`sharp`)
  - `.gitignore` (`/data/`)
  - `.env.example` (`UPLOAD_DIR`)
  - `README.md` (upload, `data/uploads` нөөцлөх)
