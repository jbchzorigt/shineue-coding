# IBDP Computer Science — сургалтын платформ

IBDP Computer Science 2027 хөтөлбөрийн "HackerRank/LeetCode" маягийн сургалтын платформ: gated модулиуд, MDX онолын хичээл, Piston sandbox дээр авто-дүгнэгддэг Python даалгавар, XP/түвшин, PDF сертификат.

## Стек

- **Next.js 16** (App Router, TypeScript) + Tailwind v4 + Shadcn UI (Base UI)
- **NextAuth v5** — Google, зөвхөн `@shineue.edu.mn` (сервер талд `hd` claim шалгана)
- **Firestore** — зөвхөн сервер талын Admin SDK-гаар (клиент хандалт rules-ээр бүрэн хаалттай)
- **Piston** (Docker) — Python кодын sandbox
- **next-mdx-remote + Shiki** — хичээлийн MDX, **Monaco** — code editor
- **jsPDF + canvas-confetti** — сертификат (кирилл: PT Sans embed)

## Хөгжүүлэлтийн орчин

```bash
npm install

# Piston sandbox (нэг удаа):
docker run -d --name piston -v piston_data:/piston -p 2000:2000 \
  --privileged --restart unless-stopped ghcr.io/engineer-man/piston:latest
curl -X POST http://localhost:2000/api/v2/packages \
  -H "Content-Type: application/json" -d '{"language":"python","version":"3.12.0"}'

npm run dev   # http://localhost:3001
```

`.env.local` (`.env.example`-ийг хуулж бөглөнө):

| Хувьсагч | Хаанаас |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → Credentials → OAuth client (redirect: `<origin>/api/auth/callback/google`) |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Console → Project settings → Service accounts |
| `PISTON_URL` | Локал: `http://localhost:2000/api/v2` |

## Скриптүүд

Бүгдийг `NODE_OPTIONS="--conditions=react-server" npx tsx <script>` хэлбэрээр ажиллуулна:

| Script | Үүрэг |
| --- | --- |
| `scripts/seed-challenges.ts` | Даалгавруудыг Firestore-д бүртгэх (public + private doc) |
| `scripts/set-role.ts <email> <role>` | Хэрэглэгчийг багш/сурагч болгох (дараа нь дахин нэвтэрнэ) |
| `scripts/deploy-rules.ts` | `firestore.rules`-ийг (deny-all) deploy хийх |
| `scripts/list-users.ts` | Хэрэглэгчдийн жагсаалт харах |
| `scripts/smoke-firestore.ts` | Firestore холболтын тест |
| `scripts/make-test-session.ts [--cleanup]` | Локал UI тестийн хуурамч session (dev-only) |

## Контент нэмэх

- **Хичээл**: `content/modules/<module-id>.mdx` — frontmatter: `module_id`, `syllabus_ref`, `title`, `order`, `description`. Дараалал `order`-оор тодорхойлогдоно; өмнөх модулийн бүх даалгавар бодогдоход дараагийнх нээгдэнэ.
- **Даалгавар**: `scripts/seed-challenges.ts`-д нэмээд дахин ажиллуулна. Төрлүүд: `coding` (Piston тест), `mcq`, `tracing`, `theory` (mark scheme + өөрийн үнэлгээ). Нууц тест, зөв хариулт, hint, mark scheme нь `challenges/{id}/private/answers`-д хадгалагдана — клиент рүү хэзээ ч илгээгдэхгүй.
- **Модуль бүрт дор хаяж 1 даалгавар байх ёстой** — үгүй бол тэр модуль хэзээ ч "дуусахгүй".

## Production deploy

1. **Piston**: аль нэг VM/VPS дээр дээрх Docker командаар хостлоод `PISTON_URL`-ийг зааж өгнө (Vercel-ийн serverless дотор Docker ажиллахгүй). Портоо галт ханаар зөвхөн апп серверээс хандахаар хязгаарлаарай.
2. **Vercel**: repo-гоо холбоод бүх env хувьсагчийг оруулна (`PISTON_URL`-д hosted Piston-ий хаяг). `FIREBASE_PRIVATE_KEY`-г `\n` эскейптэй нэг мөрөөр буулгана.
3. **Google OAuth**: Authorized redirect URIs-д `https://<domain>/api/auth/callback/google`, origins-д `https://<domain>` нэмнэ.
4. **Firestore rules**: `scripts/deploy-rules.ts` аль хэдийн deny-all deploy хийсэн — клиент шууд хандах боломжгүй.

## Архитектурын гол шийдвэрүүд

- Firestore-т **клиент огт ханддаггүй** — бүх унших/бичих нь Next.js сервер (Admin SDK) дээр. XP, дүгнэлт, модуль нээгдэлт зэрэг бүх шийдвэр server-authoritative.
- Hint-ийн 30% суутгал: hint-ийн текст буцахаас **өмнө** `hint_used` Firestore-д бичигдэнэ.
- XP зөвхөн анхны амжилттай бодолтод, Firestore transaction дотор олгогдоно.
- Сертификат: бүх даалгавар бодогдсоныг сервер шалгаж `certificates`-д нэг л удаа бүртгэнэ; `/verify/<id>` нийтэд нээлттэй баталгаажуулалт.
