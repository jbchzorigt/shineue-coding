# IBDP Computer Science — сургалтын платформ

IBDP Computer Science 2027 хөтөлбөрийн "HackerRank/LeetCode" маягийн сургалтын платформ: gated модулиуд, MDX онолын хичээл, Piston sandbox дээр авто-дүгнэгддэг Python даалгавар, XP/түвшин, PDF сертификат.

## Стек

- **Next.js 16** (App Router, TypeScript) + Tailwind v4 + Shadcn UI (Base UI)
- **NextAuth v5** — сургуулийн имэйл + нууц үг (scrypt), Google нэвтрэлт сонголттой (`@shineue.edu.mn`)
- **PostgreSQL 17** (Docker) + **Drizzle ORM** — зөвхөн Next.js сервер талаас хандана
- **Piston** (Docker) — Python кодын sandbox
- **next-mdx-remote + Shiki** — хичээлийн MDX, **Monaco** — code editor
- **jsPDF + canvas-confetti** — сертификат (кирилл: PT Sans embed)

## Хөгжүүлэлтийн орчин

Шаардлага: Node 24, Docker Desktop.

```bash
npm install
cp .env.example .env.local   # дараа нь доорх хүснэгтийн дагуу бөглөнө
npm run db:up                # Postgres (127.0.0.1:5433) + Piston (127.0.0.1:2000)
npm run piston:setup         # Python 3.12-ыг Piston-д суулгана (нэг удаа)
npm run db:migrate           # хүснэгтүүдийг үүсгэнэ
npm run db:seed              # MDX хичээлүүд + бүх даалгавар
npm run script -- scripts/create-admin.ts   # супер админ + түр нууц үг (нэг удаа хэвлэнэ)
npm run dev                  # http://localhost:3001
```

`.env.local`:

| Хувьсагч | Хаанаас |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (сонголттой) | Google Cloud Console → Credentials → OAuth client (redirect: `<origin>/api/auth/callback/google`) |
| `POSTGRES_PASSWORD` | Дурын урт санамсаргүй тэмдэгт мөр (жишээ нь `openssl rand -hex 24`) |
| `DATABASE_URL` / `TEST_DATABASE_URL` | `.env.example`-ийн загварт `POSTGRES_PASSWORD`-ийг орлуулна |
| `PISTON_URL` | `http://localhost:2000/api/v2` |
| `AUTH_TRUST_HOST` | `"true"` — LAN IP эсвэл домайнаар хандахад заавал |

## Скриптүүд

| Команд | Үүрэг |
| --- | --- |
| `npm run db:up` | Docker контейнеруудыг асаах |
| `npm run db:generate` | `src/lib/db/schema.ts` өөрчлөгдсөний дараа шинэ migration үүсгэх (`drizzle/`) |
| `npm run db:migrate` | Migration-уудыг хэрэглэх |
| `npm run db:seed` | Хичээл, даалгаврыг оруулах (дахин ажиллуулж болно) |
| `npm test` | Өгөгдлийн давхаргын integration тестүүд (`coding_test` сан дээр) |
| `npm run script -- scripts/set-role.ts <email> <role>` | Хэрэглэгчийг багш/сурагч болгох |
| `npm run script -- scripts/create-admin.ts` | Супер админыг үүсгэх / мартсан нууц үгийг шинэчлэх (түр нууц үг хэвлэнэ) |
| `npm run script -- scripts/list-users.ts` | Хэрэглэгчдийн жагсаалт |
| `npm run script -- scripts/make-test-session.ts [--teacher\|--cleanup]` | Локал UI тестийн хуурамч session (dev-only) |

## Хэрэглэгч ба нууц үг

- Нэвтрэх нэр нь сургуулийн имэйл хаяг. Сурагч өөрөө бүртгүүлэхгүй — багш `/teacher` → **Хэрэглэгч нэмэх** хэсэгт Excel/Sheets-ээс «имэйл, нэр, анги» мөрүүдийг буулгана (анги заавал биш). Хүн бүрт түр нууц үг үүсч, хайчлах хуудас болгон хэвлэнэ (зөвхөн тэр үед харагдана).
- Анх нэвтрэхэд (эсвэл нууц үг шинэчлэгдсэний дараа) хэрэглэгч өөрийн нууц үгийг тохируулахаас нааш өөр хуудас руу орохгүй.
- Анги (жишээ нь `11A`): `/teacher` хүснэгтэд шууд засна. `11а`, `11 А`, `11-A` бүгд `11A` болж нэгтгэгдэнэ. Leaderboard-ууд нэрийн араас ангийг харуулж, ангиар шүүгдэнэ.
- Мартсан нууц үг: багш хүснэгтээс **Нууц үг шинэчлэх** дарна. Тэр хүний бүх session тэр даруй гарна.
- 5 удаа буруу оруулбал 15 минут түгжинэ («Түгжигдсэн» тэмдэг). Нууц үг шинэчлэхэд түгжээ тайлагдана.
- Эрх: багш — сурагч; админ — сурагч ба багш. Админы нууц үгийг зөвхөн `create-admin` скрипт шинэчилнэ.

## Контент нэмэх

- **Хичээл**: `content/modules/<module-id>.mdx` — frontmatter: `module_id`, `syllabus_ref`, `title`, `order`, `description`. Дараалал `order`-оор тодорхойлогдоно; өмнөх модулийн бүх даалгавар бодогдоход дараагийнх нээгдэнэ. Ижил `order`-той модулиуд хамт нээгдэж, дараагийн шат руу орохын өмнө бүгд дуусгагдана. Хожим нэмсэн модуль тэр шатанд хүрсэн сурагчдад автоматаар нээгдэнэ (`src/lib/unlock.ts`).
- **Даалгавар**: `scripts/seed-challenges.ts`-д нэмээд `npm run db:seed`-ийг дахин ажиллуулна. Төрлүүд: `coding` (Piston тест), `mcq`, `tracing`, `theory` (mark scheme + өөрийн үнэлгээ), `logic` (логик хаалгаар хэлхээ зурах; жишээнүүд `scripts/seed-logic.ts`-д). Нууц тест, зөв хариулт, hint, mark scheme, хүлээгдэж буй үнэний хүснэгт нь `challenge_answers` хүснэгтэд хадгалагдана. Эдгээр нь клиент рүү хэзээ ч илгээгдэхгүй (logic бодлогын хүснэгтийг зөвхөн "харуулах" гэж тохируулсан үед).
- Даалгаваргүй (зөвхөн хичээлтэй) модуль дууссанд тооцогдож, дараагийнхыг түгжихгүй. Гэхдээ сертификат зөвхөн даалгавруудыг тоолно.
- **Мэдээний ангилал**: Мэдэгдэл, Тэмцээн, Хичээл, Амжилт, Арга хэмжээ — тогтмол жагсаалт (`src/lib/news-categories.ts` + `news_category_check`). `/news` болон нүүр хуудсанд `?category=`-ээр шүүгдэнэ.
- **Тэмцээний илгээлтүүд**: `/teacher/contests/<id>` → «Илгээлтүүд». Бүх оролдлогыг сурагч, бодлогоор шүүж харна; «Дүн», «Бүх оролдлого» CSV (Excel). «Хуулбар сэжиг» таб сурагч бүрийн шилдэг бодолтыг харьцуулж ≥70% төстэй хосыг харуулна (Python: токен + winnowing, эхлэлийн код болон 5–6 мөрөөс богино бодолт тооцогдохгүй; хэлхээ: бүтцээр). Шийдвэрийг багш гаргана.
- **Мэдээний зураг, дуу**: `/teacher/news` форм дээр «Файл сонгох» / «Зураг оруулах»-аар оруулна (зураг ≤ 5MB, дуу ≤ 20MB). Зураг WebP болж, GPS/EXIF мэдээлэл нь арилна. Файлууд `data/uploads/` (эсвэл `UPLOAD_DIR`)-д хадгалагдаж `/media/…`-ээр үйлчлэгдэнэ — **энэ хавтсыг өгөгдлийн сантай хамт нөөцөлнө**.

## Vercel (үүлэн хувилбар)

- DB: Neon (Vercel Marketplace), мэдээний файлууд: Vercel Blob (браузераас шууд), Python: энэ компьютерийн Piston ← Cloudflare quick tunnel.
- Компьютер дахин асах бүрд (Docker, cloudflared суусан байх):

  ```bash
  npm.cmd run script -- scripts/piston-tunnel.ts
  ```

  Tunnel нээж, Vercel-ийн `PISTON_URL`-ийг шинэчлээд production-ийг дахин deploy хийнэ.
- Production DB-д script ажиллуулах: `vercel env pull .env.vercel-prod --environment=production`, дараа нь `npm.cmd run script:prod -- scripts/<нэр>.ts`.
- `drizzle/`-д шинэ migration нэмэгдсэн бол deploy-оос **өмнө**: `npm.cmd run script:prod -- scripts/migrate.ts` (Neon-ы шууд холболтоор ажиллана).
- Deploy: `vercel deploy --prod` (`.vercelignore` нь `.env*`, `data/`-г илгээхгүй).

## Production

Апп сургуулийн компьютер дээр Docker (Postgres, Piston) + Next.js production горимоор ажиллана.
Windows service, Cloudflare Tunnel, домайны тохиргооны заавар дараагийн шатанд нэмэгдэнэ.

- **Google OAuth**: Authorized redirect URIs-д `https://<domain>/api/auth/callback/google`, origins-д `https://<domain>` нэмнэ.
- **`AUTH_SECRET`**: production-д шинээр үүсгэнэ (хуучин Vercel-ийнхийг бүү ашигла). Ингэснээр өгөгдлийн санд мөргүй хуучин session-ууд хүчингүй болж, хэрэглэгчид дахин нэвтрэхэд бүртгэл нь шинээр үүснэ.
- **Имэйлийн давхардал**: Google Workspace бүртгэл устаад ижил хаягаар дахин үүсвэл нэвтрэх хуудас "өөр Google бүртгэлтэй холбогдсон" гэж харуулна. Админ `/teacher` хэсгээс хуучин хэрэглэгчийг устгасны дараа тухайн хүн дахин нэвтэрч чадна.

## Архитектурын гол шийдвэрүүд

- Өгөгдлийн санд **клиент огт ханддаггүй** — бүх унших/бичих нь Next.js сервер дээр (`src/lib/db/`). Postgres-ийн порт зөвхөн `127.0.0.1`-д нээлттэй. XP, дүгнэлт, модуль нээгдэлт зэрэг бүх шийдвэр server-authoritative.
- Hint-ийн 30% суутгал: hint-ийн текст буцахаас **өмнө** `hint_used` өгөгдлийн санд бичигдэнэ.
- XP зөвхөн анхны амжилттай бодолтод, submission мөрийг `FOR UPDATE`-ээр түгжсэн transaction дотор олгогдоно.
- Сертификат: бүх даалгавар бодогдсоныг сервер шалгаж `certificates`-д нэг л удаа бүртгэнэ; `/verify/<id>` нийтэд нээлттэй баталгаажуулалт.
- Session (JWT, 7 хоног) хүсэлт бүрд `users`-ийн `session_version`-той тулгагдана (`src/auth.ts` → `refreshToken`): нууц үг солих/шинэчлэх, хэрэглэгч устгахад session тэр даруй дуусна; эрхийн өөрчлөлт шууд үйлчилнэ. Proxy (Next 16-д Node runtime) бүрэн auth instance ашиглана.
