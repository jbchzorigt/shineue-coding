# Firestore → PostgreSQL шилжүүлэлт (Дэд төсөл 1/3)

Огноо: 2026-09-29
Төлөв: Дизайн батлагдсан, spec хянагдаж байна

## Зорилго ба хүрээ

Платформыг сургуулийн компьютер (Windows, Docker Desktop) дээр өөрөө хостлоход бэлдэх
томоохон ажлын эхний хэсэг. Firestore-ийг орон нутгийн PostgreSQL-ээр сольж, Piston-ийг
мөн тэр компьютер дээр ажиллуулна.

Бүх ажлын задаргаа:

1. **Postgres шилжүүлэлт** ← энэ spec
2. Энэ компьютерийг сервер болгох (production build, Windows service, sleep, нөөцлөлт)
3. Домайн (Hostinger) + Cloudflare Tunnel + Google OAuth redirect

### Хэрэглэгчийн шийдвэрүүд

- Сайт сургууль болон гэрээс хоёуланд нь нээлттэй байна (2, 3-р хэсэгт Cloudflare Tunnel).
- Өгөгдлийн сан нь PostgreSQL байна.
- **Шинээр эхэлнэ.** Firestore-оос өгөгдөл шилжүүлэхгүй. Контентыг repo-гийн MDX болон
  seed скриптүүдээр дахин оруулна.
- Технологи нь Drizzle ORM + `postgres` (postgres-js) драйвер.

### Таамаглал

- Vercel-ийн deployment ашиглалтаас гарна, учир нь локал Postgres руу хандах боломжгүй.
  Үүнийг 2, 3-р хэсэгт хийнэ.
- Google OAuth (`@shineue.edu.mn`) болон NextAuth JWT session өөрчлөгдөхгүй.
- `shineue-db` контейнер (`D:\2026-2027 lessons\Shine ue website\backend`) нь өөр төслийнх
  тул түүнд хүрэхгүй.

### Хүрээнээс гадуур

- Production build, Windows service, домайн, tunnel (2, 3-р хэсэг)
- Firestore-оос өгөгдөл экспортлох
- Шинэ функц нэмэх. Бүх хэрэглэгчийн урсгал одоогийнхтой ижилхэн ажиллах ёстой.

### Амжилтын шалгуур

1. `firebase-admin` сан болон бүх Firestore код repo-оос бүрэн хасагдсан байх.
2. `npm run db:up && npm run db:migrate && npm run db:seed` гэсэн командын дараа
   апп локал Postgres болон Piston дээр ажилладаг байх.
3. `npm test` (db давхаргын integration тестүүд) амжилттай давах.
4. `npm run build` болон `npm run lint` алдаагүй дуусах.
5. Dev server дээр туршилтын session-оор нэвтэрч доорх урсгалууд гараар шалгахад ажиллах:
   хичээл, код илгээх, MCQ, tracing, theory, hint, модуль нээгдэх, тэмцээн, мэдээ,
   сертификат, `/verify`, багшийн самбар, хэрэглэгчийн эрх ба устгалт.

## 1. Орчин: `docker-compose.yml`

| Service | Image | Host порт | Volume | Бусад |
|---|---|---|---|---|
| `db` | `postgres:17` | `127.0.0.1:5433:5432` | `coding-pgdata` | `POSTGRES_DB=coding`, `POSTGRES_USER=coding`, `POSTGRES_PASSWORD` нь env-ээс |
| `piston` | `ghcr.io/engineer-man/piston:latest` | `127.0.0.1:2000:2000` | `coding-piston` | `privileged: true` |

- Хоёр service хоёулаа `restart: unless-stopped` тохиргоотой.
- Портууд зөвхөн loopback дээр нээгдэнэ, LAN-аас шууд хандах боломжгүй.
- 5432 портыг `shineue-db` эзэлсэн тул 5433-ыг ашиглана.
- Compose нь хувьсагчаа `--env-file .env.local`-ээс авна (npm скриптэд оруулсан).
- `db` service нь `/docker-entrypoint-initdb.d/` дотор `coding_test` өгөгдлийн санг
  үүсгэх init скрипттэй. Энэ сан тестэд зориулагдсан.

### Env хувьсагчид (`.env.local`, `.env.example`)

- Хасах: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Нэмэх:
  - `POSTGRES_PASSWORD`: санамсаргүйгээр үүсгэнэ
  - `DATABASE_URL="postgres://coding:<pw>@127.0.0.1:5433/coding"`
  - `TEST_DATABASE_URL="postgres://coding:<pw>@127.0.0.1:5433/coding_test"`
- Өөрчлөгдөхгүй: `AUTH_*`, `PISTON_URL="http://localhost:2000/api/v2"`

### npm скриптүүд

| Скрипт | Үүрэг |
|---|---|
| `db:up` | `docker compose --env-file .env.local up -d` |
| `db:generate` | `drizzle-kit generate`: schema-аас SQL migration үүсгэнэ |
| `db:migrate` | Migration-уудыг `DATABASE_URL` руу хэрэглэнэ |
| `db:seed` | `import-content`, `seed-challenges`, `seed-data-analyst` скриптүүдийг дарааллаар ажиллуулна |
| `piston:setup` | Piston-д Python 3.12.0 суулгана (нэг удаа) |
| `test` | `coding_test` руу migration хийгээд `tsx --test` ажиллуулна |

Migration файлууд `drizzle/` хавтсанд хадгалагдаж, git-д commit хийгдэнэ.

## 2. Хүснэгтүүдийн бүтэц

TypeScript-ийн domain төрлүүд (`src/lib/types.ts` болон db модулиудын экспортолдог interface-ууд)
**өөрчлөгдөхгүй**. Хүснэгтийн мөрийг domain төрөл рүү хөрвүүлэх ажлыг db модуль бүр хийнэ:
`timestamptz` утгыг epoch ms эсвэл ISO огноо болгоно, `null` утгуудыг хэвийн болгоно.

```
users
  uid text PK                      -- Google providerAccountId
  email text NOT NULL UNIQUE
  name text, photo_url text
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin'))
  total_xp integer NOT NULL DEFAULT 0
  unlocked_modules text[] NOT NULL DEFAULT '{}'
  created_at timestamptz NOT NULL DEFAULT now()
  last_login_at timestamptz NOT NULL DEFAULT now()

modules
  id text PK, syllabus_ref text NOT NULL DEFAULT '', title text NOT NULL,
  "order" integer NOT NULL, description text NOT NULL DEFAULT '', lesson_mdx text NOT NULL DEFAULT ''

challenges
  id text PK
  module_id text NOT NULL FK → modules(id) ON DELETE CASCADE
  type text NOT NULL CHECK (type IN ('mcq','tracing','coding','theory'))
  title text NOT NULL, prompt text NOT NULL, xp_reward integer NOT NULL, "order" integer NOT NULL
  language text, starter_code text
  public_test_cases jsonb, options jsonb, has_hint boolean
  INDEX (module_id)

challenge_answers                 -- нууц хэсэг: клиент рүү хэзээ ч илгээхгүй
  challenge_id text PK FK → challenges(id) ON DELETE CASCADE
  hidden_test_cases jsonb, hint text, correct_answer_index integer,
  expected_answer text, mark_scheme text

submissions
  uid text FK → users(uid) ON DELETE CASCADE
  challenge_id text FK → challenges(id) ON DELETE CASCADE
  passed boolean NOT NULL DEFAULT false
  attempts integer NOT NULL DEFAULT 0
  code_snapshot text NOT NULL DEFAULT ''
  hint_used boolean NOT NULL DEFAULT false
  updated_at timestamptz NOT NULL DEFAULT now()
  PK (uid, challenge_id)

certificates
  id text PK                       -- 20 тэмдэгттэй [A-Za-z0-9], Firestore auto-id-тай ижил хэлбэр
  uid text NOT NULL UNIQUE FK → users(uid) ON DELETE CASCADE
  name text NOT NULL, syllabus text NOT NULL, issued_at timestamptz NOT NULL DEFAULT now()

news
  id text PK                       -- 20 тэмдэгттэй [A-Za-z0-9]
  title text NOT NULL, body_mdx text NOT NULL
  image_url text, video_url text, audio_url text
  author_name text, author_uid text NOT NULL      -- FK байхгүй: багш устсан ч мэдээ үлдэнэ
  published_at timestamptz NOT NULL DEFAULT now()

contests
  id text PK, title text NOT NULL, description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL

contest_problems
  contest_id text FK → contests(id) ON DELETE CASCADE, id text
  title text NOT NULL, prompt text NOT NULL, "order" integer NOT NULL, points integer NOT NULL
  starter_code text, public_test_cases jsonb NOT NULL DEFAULT '[]'
  PK (contest_id, id)

contest_problem_answers
  contest_id text, problem_id text, hidden_test_cases jsonb NOT NULL DEFAULT '[]'
  PK (contest_id, problem_id), FK → contest_problems ON DELETE CASCADE

contest_participants
  contest_id text FK → contests(id) ON DELETE CASCADE
  uid text FK → users(uid) ON DELETE CASCADE
  name text, email text NOT NULL
  scores jsonb NOT NULL DEFAULT '{}'   -- problem id → хамгийн өндөр оноо
  total integer NOT NULL DEFAULT 0
  last_improved_at timestamptz
  registered_at timestamptz NOT NULL DEFAULT now()
  PK (contest_id, uid)

contest_submissions                -- оролдлогын түүх (зөвхөн нэмэгддэг)
  id bigserial PK
  contest_id text, uid text        -- FK → contest_participants(contest_id, uid) ON DELETE CASCADE
  problem_id text NOT NULL, code text NOT NULL, score integer NOT NULL,
  passed_tests integer NOT NULL, total_tests integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
```

### Устгалтын үр дагавар

- **Хэрэглэгч устгах:** Нэг `DELETE FROM users` командаар бодолт, сертификат,
  тэмцээний оролцоо, оролдлогын түүх бүгд хамт устана. Admin устгах хамгаалалт
  хэвээр үлдэнэ.
- **Модуль устгах:** Модулийн даалгавар, хариулт, бодолтууд хамт устана.
  Өмнө нь эдгээр нь өнчин үлддэг байсан. Сурагчийн `total_xp` хэвээр үлдэнэ.
  `unlocked_modules` дотор устсан id үлдэж болох ч хор хөнөөлгүй (өмнөхтэй адил).
- **Даалгавар устгах:** Хариулт болон бодолтууд хамт устана.

## 3. Код

### Бүтэц

```
src/lib/db/
  client.ts        drizzle(postgres(DATABASE_URL, { max: 10 }), { schema }),
                   dev HMR-ийн үед globalThis дээрх singleton; import хийхэд алдаа шидэхгүй (lazy)
  schema.ts        Drizzle хүснэгтийн тодорхойлолтууд
  ids.ts           newId(): 20 тэмдэгттэй [A-Za-z0-9] (crypto.randomInt)
  users.ts         ensureUserProfile, getUserProfile, setUserRole, deleteUserCascade,
                   unlockModule
  modules.ts       listModules, getModule, getFirstModuleId, upsertModule, deleteModule
  challenges.ts    getChallenge, getChallengePrivate, listChallengesByModule,
                   upsertChallenge, deleteChallenge
  submissions.ts   getSubmission, listPassedChallengeIds, markHintUsed, recordSubmission
  certificates.ts  SYLLABUS_TITLE, getOrCreateCertificate, getCertificate
  news.ts          listNews, getNews, createNews, updateNews, deleteNews
  contests.ts      contestStatus, Contest/Problem/Participant төрлүүд + бүх CRUD,
                   registerParticipant, applySubmissionScore
  teacher.ts       listStudentOverviews
```

- Бүх файл `import "server-only"`-ээр эхэлнэ.
- Экспортолж буй функцүүдийн нэр, параметр, буцаах төрөл одоогийн `src/lib/firebase/*`-тэй
  **ижил** байна.
- `src/lib/progression.ts` байрандаа үлдэнэ (`levelFromXp`, `getCourseProgress`,
  `maybeUnlockNextModule`). Доторх `getDb()` бичилт нь `users.ts`-ийн
  `unlockModule(uid, moduleId)` дуудлагаар солигдоно.
- `teacher-actions.ts` доторх `getDb()` дуудлагууд `setUserRole` болон
  `deleteUserCascade` функцүүдээр солигдоно.
- Бүх хуудас, API route, component, action дотор `@/lib/firebase/` гэсэн import замыг
  `@/lib/db/` болгож солино. Логик өөрчлөгдөхгүй.
- `auth.ts`, `auth.config.ts`, `proxy.ts` доторх "firebase-admin" гэсэн тайлбаруудыг
  шинэчилнэ. Proxy нь db модуль import хийхгүй хэвээр байна.

### Transaction болон зэрэг хүсэлт

| Функц | Хэрэгжүүлэлт |
|---|---|
| `ensureUserProfile` | Нэг `INSERT … ON CONFLICT (uid) DO UPDATE SET name, photo_url, last_login_at` (super admin бол `role='admin'` нэмнэ) `RETURNING *`. `total_xp` болон `unlocked_modules` зөвхөн анхны insert үед тохирно. |
| `recordSubmission` | Transaction дараах дарааллаар явна. (1) `INSERT submissions … ON CONFLICT DO NOTHING`. (2) Тэр мөрийг `SELECT … FOR UPDATE`-ээр түгжинэ. (3) Анхны амжилттай бодолт мөн эсэхийг тооцож XP-г бодно. Hint ашигласан бол `round(xp × 0.7)` болно. (4) `passed = passed OR $passed`, `attempts + 1`, `code_snapshot`, `updated_at` шинэчилнэ. (5) XP > 0 бол `UPDATE users SET total_xp = total_xp + $xp`. |
| `markHintUsed` | `INSERT … ON CONFLICT (uid, challenge_id) DO UPDATE SET hint_used = true`. Hint-ийн текстийг буцаахаас **өмнө** дуудагдана (одоогийнхтой адил). |
| `unlockModule` | `UPDATE users SET unlocked_modules = array_append(unlocked_modules, $id) WHERE uid = $uid AND NOT ($id = ANY(unlocked_modules))` |
| `registerParticipant` | `INSERT … ON CONFLICT DO NOTHING` |
| `applySubmissionScore` | (1) `contest_submissions`-д мөр нэмнэ, transaction-ээс гадуур. (2) Transaction дотор оролцогчийн мөрийг `SELECT … FOR UPDATE`-ээр түгжинэ. Мөр байхгүй бол "Оролцогч бүртгэлгүй байна." гэсэн алдаа шиднэ. Оноо өмнөхөөсөө сайжирсан тохиолдолд л `scores`, `total`, `last_improved_at = now()`-г шинэчилнэ. |
| `getOrCreateCertificate` | `INSERT … ON CONFLICT (uid) DO NOTHING`, дараа нь `SELECT … WHERE uid`. |
| `listStudentOverviews` | `users LEFT JOIN submissions GROUP BY uid` ашигласан нэг асуулга: passed_count, total_attempts, hints_used-ийг тоолно. `includeStaff`-аас хамаарч role-оор шүүнэ. XP-ээр буурахаар эрэмбэлнэ. |
| `upsertChallenge` / `upsertProblem` | Public болон нууц хэсгийг нэг transaction дотор upsert хийнэ. |
| `listParticipants` | `ORDER BY total DESC, last_improved_at ASC NULLS LAST` |

`getModule`, `getNews`, `getCertificate`, `getContest` доторх ID-ийн regex шалгалтууд хэвээр үлдэнэ.

### Алдааны боловсруулалт

- Хуудсууд одоогийн `try/catch`, `.catch(() => [])` хэлбэрүүдээ хэвээр хадгална.
- `DATABASE_URL` тохируулаагүй бол query хийх үед ойлгомжтой алдаа шиднэ (`admin.ts`-ийнхтэй адил).
  Import хийх үед алдаа шидэхгүй тул build эвдрэхгүй.

### Скриптүүд

| Скрипт | Шийдвэр |
|---|---|
| `import-content.ts` | `upsertModule`-ийг ашиглана |
| `seed-challenges.ts`, `seed-data-analyst.ts` | `upsertChallenge`-ийг ашиглана |
| `set-role.ts`, `list-users.ts` | db давхаргыг ашиглана |
| `make-test-session.ts` | `ensureUserProfile` болон `deleteUserCascade`-ийг ашиглана |
| `deploy-rules.ts`, `smoke-firestore.ts`, `migrate-duplicate-users.ts`, `fix-piston-tunnel.sh` | Устгана |

`firestore.rules`, `src/lib/firebase/` хавтас болон `firebase-admin` dependency-г мөн устгана.
Шинээр `drizzle-orm` ба `postgres` (dependencies), `drizzle-kit` ба `tsx` (devDependencies) нэмнэ.

README-ийн дараах хэсгүүдийг шинэчилнэ: Стек, Хөгжүүлэлтийн орчин, Скриптүүд, Архитектур.

## 4. Тест

- **Runner:** `node:test`-ийг `tsx --test --conditions=react-server` хэлбэрээр ажиллуулна.
  Тестийн файлууд `src/lib/db/*.test.ts`.
- **Өгөгдлийн сан:** `TEST_DATABASE_URL` (`coding_test`). `npm test` эхлээд migration хийнэ.
  Тест бүрийн өмнө `TRUNCATE … CASCADE` ажиллана.
- **Шалгах зүйлс:**
  1. `ensureUserProfile`: шинэ хэрэглэгч 0 XP-тэй, эхний модуль нь нээлттэй үүснэ. Дахин
     нэвтрэхэд XP болон нээлттэй модулиуд хэвээр байж, зөвхөн нэр шинэчлэгдэнэ.
     Super admin-ы role өөрөө сэргэнэ.
  2. `recordSubmission`: анх амжилттай бодоход л XP олгоно. Дахин давахад 0 XP, дараа нь
     унасан ч "passed" төлөв хэвээр. Hint ашигласан бол 70% олгоно. Хоёр бодолт зэрэг
     (`Promise.all`) илгээхэд XP нэг л удаа орно.
  3. `unlockModule`: хоёр удаа дуудахад давхардал үүсэхгүй.
  4. `applySubmissionScore`: хамгийн өндөр оноо хадгалагдана, бага оноо өөрчлөлт хийхгүй.
     Бүртгэлгүй оролцогч алдаа гаргана. `listParticipants`-ийн эрэмбэ болон тэнцсэн үед
     түрүүлж оноо авсан нь дээр байна.
  5. `getOrCreateCertificate`: хоёр удаа дуудахад ижил ID буцаана.
  6. `deleteUserCascade`: бодолт, сертификат, оролцоо, оролдлогын түүх бүгд устана.
  7. `getChallenge`-ийн хариунд `challenge_answers`-ийн талбарууд байхгүй.
  8. `listStudentOverviews`: тоонууд зөв гарна, `includeStaff` шүүлт ажиллана.
- **Гар шалгалт:** Шалгуур №5-ыг `make-test-session.ts`-ийн cookie-ээр нэвтэрч,
  built-in browser дээр явуулна.

## Эрсдэл

- **Piston + cgroup v2 (Docker Desktop, WSL2):** Mac-ийн Docker Desktop дээр ажиллаж байсан
  ч энэ компьютер дээр анх удаа асах гэж байна. Хэрэгжүүлэлтийн эхний алхамд шалгана.
  Ажиллахгүй бол зогсоод хэрэглэгчид мэдэгдэнэ.
- **Next.js 16-ийн өөрчлөлтүүд:** `AGENTS.md` дүрмийн дагуу код бичихээс өмнө
  `node_modules/next/dist/docs/`-оос холбогдох заавруудыг уншина.
