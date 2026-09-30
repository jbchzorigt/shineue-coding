# Имэйл + нууц үгээр нэвтрэх

Огноо: 2026-09-29
Төлөв: Дизайн батлагдсан, spec хянагдаж байна
Өмнөх ажил: `2026-09-29-postgres-migration-design.md` (Postgres шилжүүлэлт, дууссан)

## Зорилго

Google Cloud Console-оор OAuth тохируулахгүйгээр платформд нэвтэрдэг болгох. Сурагч, багш
сургуулийн имэйл хаяг болон нууц үгээрээ нэвтэрнэ.

Мөн Google OAuth-ээс ялгаатай нь домайн, HTTPS шаардахгүй тул сургуулийн дотоод сүлжээнд
(`http://192.168.1.121:3001`) шууд ажиллана.

### Хэрэглэгчийн шийдвэрүүд

- Нэвтрэх нэр нь сургуулийн имэйл хаяг (`@shineue.edu.mn`).
- Бүртгэл үүсгэх, нууц үг шинэчлэх эрхтэй хүмүүс:
  - **Багш:** сурагчийн бүртгэл.
  - **Админ:** сурагч болон багшийн бүртгэл.
- Сурагчдыг жагсаалт буулгах аргаар нэмнэ: Excel эсвэл Sheets-ээс хуулсан `имэйл, нэр` мөрүүд.
- Техникийн арга нь "A": NextAuth-ийн Credentials provider ашиглаж, хүсэлт бүрд session-ийг
  өгөгдлийн сантай тулгана.

### Хүрээнээс гадуур

Дараах зүйлс энэ ажилд орохгүй:

- анги/бүлэг;
- имэйл хаяг солих;
- сурагч өөрөө бүртгүүлэх;
- нууц үгээ имэйлээр сэргээх;
- Google болон нууц үгээр нэвтрэх бүртгэлүүдийг холбох;
- LAN-аас хандах Windows firewall-ын дүрэм (серверийн тохиргооны ажилд хийгдэнэ).

### Амжилтын шалгуур

1. Сурагч `/login` хуудсанд имэйл болон нууц үгээрээ нэвтэрч чаддаг.
2. Анх нэвтэрсний дараа нууц үгээ солихоос нааш өөр хуудас руу орж чадахгүй.
3. Багш жагсаалт буулгаж сурагчдыг нэмэхэд түр нууц үгтэй хэвлэх хуудас гарна.
4. Нууц үг шинэчлэгдэх эсвэл хэрэглэгч устгагдахад тухайн хүний нээлттэй session тэр даруй хүчингүй болно.
5. Дараалан 5 удаа буруу оруулбал 15 минут түгжинэ. Багш нууц үгийг шинэчилбэл түгжээ тайлагдана.
6. `npm test`, `tsc`, `lint` (алдаа 0), `next build` бүгд амжилттай. Хөтөч дээрх гар шалгалт (§6) давсан байна.

## 1. Өгөгдөл

`users` хүснэгтэд нэмэгдэх баганууд (migration `drizzle/0002_*.sql`):

| Багана | Төрөл | Үүрэг |
|---|---|---|
| `password_hash` | `text NULL` | `scrypt$N$r$p$salt$hash` (base64). Утгагүй бол нууц үгээр нэвтрэх боломжгүй (Google-оор үүссэн бүртгэл). |
| `must_change_password` | `boolean NOT NULL DEFAULT false` | Бүртгэл үүсгэх эсвэл нууц үг шинэчлэх үед `true` болно. |
| `session_version` | `integer NOT NULL DEFAULT 0` | Нууц үг солих эсвэл шинэчлэх бүрт +1 болно. |
| `failed_logins` | `integer NOT NULL DEFAULT 0` | Дараалсан буруу оролдлогын тоо. |
| `locked_until` | `timestamptz NULL` | Энэ цаг хүртэл нэвтрэхийг хориглоно. |

- Багш эсвэл админы үүсгэсэн хэрэглэгчийн `uid` нь `newId()` (20 тэмдэгт) байна.
- Google-ээр үүссэн хэрэглэгчийн `uid` нь өмнөх шигээ Google-ийн account id хэвээр.
- Имэйлийг `trim` хийж жижиг үсэг рүү хөрвүүлээд хадгална.

## 2. Кодын бүтэц

| Файл | Үүрэг |
|---|---|
| `src/lib/passwords.ts` | `hashPassword`, `verifyPassword`, `generateTempPassword` (server-only, `node:crypto`) |
| `src/lib/user-list.ts` | `parseUserList(text)` — цэвэр функц, DB ашиглахгүй |
| `src/lib/types.ts` | `canManageAccount(actorRole, targetRole)` нэмэгдэнэ (`isStaff`-ийн хажууд) |
| `src/lib/auth-token.ts` | `refreshToken(token, state)` — цэвэр функц, session хүчинтэй эсэхийг шийднэ |
| `src/lib/db/accounts.ts` | `createUsers`, `verifyLogin`, `resetPassword`, `changePassword`, `getAuthState`, `upsertSuperAdmin` |
| `src/lib/auth-actions.ts` | `loginAction`, `changePasswordAction` нэмэгдэнэ (`signOutAction`-ийн хажууд) |
| `src/lib/account-actions.ts` | Багш/админы server action-ууд: `createUsersAction`, `resetPasswordAction` |
| `src/auth.config.ts` | Google provider-ийг нөхцөлтэйгөөр нэмэх, `signIn`-д credentials зөвшөөрөх, `session` callback, `authorized`-д нууц үг солих шилжүүлэлт, `maxAge` 7 хоног |
| `src/auth.ts` | Credentials provider (`authorize` → `verifyLogin`), `jwt` callback (`getAuthState` + `refreshToken`) |
| `src/proxy.ts` | Бүрэн `auth` instance-ийг ашиглана (Next 16-д proxy Node runtime дээр ажилладаг) |
| `src/app/login/page.tsx` | Имэйл + нууц үгийн форм. Google товч тохиргоо байгаа үед л гарна. Алдааны мессежүүд. |
| `src/app/account/password/page.tsx` | Нууц үг солих хуудас |
| `src/app/teacher/users/new/page.tsx` | Жагсаалт буулгах, үр дүн, хэвлэх хуудас |
| `src/components/teacher/reset-password-button.tsx` | Мөр дээрх "Нууц үг шинэчлэх" товч, түр нууц үгийг харуулна |
| `src/app/teacher/page.tsx` | "Хэрэглэгч нэмэх" холбоос, шинэчлэх товч, "Түгжигдсэн" тэмдэг |
| `src/lib/db/teacher.ts` | `StudentOverview`-д `locked: boolean` нэмэгдэнэ |
| `scripts/create-admin.ts` | Супер админыг үүсгэх эсвэл нууц үгийг нь шинэчилж, түр нууц үгийг нэг удаа хэвлэнэ |
| `scripts/make-test-session.ts` | JWT-д `sv` (session_version) нэмнэ |
| `src/components/user-menu-client.tsx` | "Нууц үг солих" цэс нэмэгдэнэ |

## 3. Нэвтрэлтийн урсгал

### Нэвтрэх

1. `/login` форм `loginAction`-ийг дуудаж, тэр нь `signIn("credentials", { email, password, redirectTo: "/" })`-ийг ажиллуулна.
2. `authorize` нь имэйлийг хэвийн болгоод `verifyLogin`-ийг дуудна. `verifyLogin` дараах гурвын нэгийг буцаана:
   - `{ ok: true, user: { uid, email, name } }`: `failed_logins = 0`, `locked_until = null` болж, `last_login_at` шинэчлэгдэнэ.
   - `{ ok: false, reason: "invalid" }`: имэйл байхгүй, нууц үг буруу эсвэл `password_hash` хоосон. Нууц үг буруу үед `failed_logins` атомар +1 болно. 5-д хүрвэл `locked_until = now() + 15 минут` болно.
   - `{ ok: false, reason: "locked" }`: `locked_until > now()`. Нууц үгийг шалгахгүй.
3. `authorize` буцаасан утгыг ингэж боловсруулна:
   - `invalid` бол `null` буцаана. Нэвтрэх хуудас "Имэйл эсвэл нууц үг буруу байна." гэж харуулна.
   - `locked` бол `code = "locked"`-тэй `CredentialsSignin` алдаа шиднэ. Нэвтрэх хуудас "Олон удаа буруу оруулсан тул 15 минут түгжигдлээ. Багшдаа хандана уу." гэж харуулна.

### Session

- JWT-д `sub = uid` болон `sv = session_version` бичигдэнэ.
- `jwt` callback **хүсэлт бүрд** `getAuthState(uid)`-ийг дуудна. Энэ нь `{ role, must_change_password, session_version } | null` буцаана.
- Үр дүнг `refreshToken(token, state)` шийднэ:
  - Мөр байхгүй эсвэл `sv ≠ session_version` бол `null` буцаана, хэрэглэгч гарна.
  - Бусад үед `token.role` болон `token.mustChangePassword`-ийг шинэчилнэ.
- `sv` байхгүй хуучин токенийг `0` гэж үзнэ.
- `session` callback `id`, `role`, `mustChangePassword`-ийг session руу хуулна.
- `session.maxAge` = 7 хоног.

### Нууц үг солихыг албадах

- `authConfig.callbacks.authorized` нь нэвтэрсэн хэрэглэгчийн `mustChangePassword` үнэн бөгөөд одоогийн зам `/account/password` биш бол `/account/password` руу шилжүүлнэ.
- `proxy.ts` бүрэн `auth`-ийг ашигладаг тул энэ утга өгөгдлийн сангаас шинээр уншигдана.

### Нууц үг солих

- `changePasswordAction` нь одоогийн нууц үг, шинэ нууц үг болон түүний давталтыг авна.
- Шалгалтууд:
  - шинэ нууц үг 8–128 тэмдэгт;
  - шинэ нь хуучинтайгаа ижил биш;
  - давталт таарч байх;
  - одоогийн нууц үг зөв.
- Амжилттай бол:
  - hash шинэчлэгдэнэ;
  - `must_change_password = false` болно;
  - `session_version` +1 болж, бусад төхөөрөмж гарна;
  - дараа нь `signIn("credentials", …)` шинэ нууц үгээр дахин нэвтрүүлж `/` руу шилжүүлнэ.

### Google

- `AUTH_GOOGLE_ID` болон `AUTH_GOOGLE_SECRET` хоёулаа тохируулсан үед л provider нэмэгдэж, нэвтрэх хуудсанд товч гарна.
- Урсгал нь одоогийнхтой ижил (`ensureUserProfile`, `AccountConflict`). `jwt` callback нь `sv`-г мөн тэр мөрөөс авна.
- `authConfig.callbacks.signIn`: `credentials`-ийг зөвшөөрнө (`authorize` аль хэдийн шалгасан). `google`-д одоогийн домайн шалгалт хэвээр үлдэнэ.

### Супер админ

- `npm run script -- scripts/create-admin.ts` нь `SUPER_ADMIN_EMAIL`-ээр хэрэглэгч үүсгэнэ, эсвэл байгаа бол шинэчилнэ.
- Үүсгэхдээ дараах утгуудыг онооно: `role = admin`, шинэ түр нууц үг, `must_change_password = true`, `session_version` +1, түгжээгүй.
- Түр нууц үгийг зөвхөн терминалд нэг удаа хэвлэнэ.

## 4. Багш ба админы удирдлага

### Хэрэглэгч нэмэх (`/teacher/users/new`)

**Задлах дүрэм (`parseUserList`):**
- Мөр бүрийг tab, `,` эсвэл `;`-ээр хуваана. Эхний багана нь имэйл, хоёр дахь нь нэр.
- Хоосон мөрийг алгасна.
- Нэр хоосон бол имэйлийн `@`-ийн өмнөх хэсгийг нэр болгоно.
- Имэйлийг хэвийн болгоно (`trim`, жижиг үсэг).

**Алдааны дүрэм:**
- Дараах тохиолдлуудад мөрийн дугаартай алдаа буцаана:
  - имэйлийн хэлбэр буруу (`^[^\s@]+@[^\s@]+\.[^\s@]+$`-д таарахгүй);
  - хэлбэр зөв ч домайн `@shineue.edu.mn` биш;
  - нэг жагсаалтад давхардсан;
  - 200-аас олон мөр.
- Нэг ч алдаа байвал **юу ч үүсгэхгүй**.

**Эрх:**
- Багшийн нэмсэн хүмүүс үргэлж `student` байна.
- Админ `student` эсвэл `teacher`-ийг сонгоно.

**`createUsers`:**
- Бүртгэлтэй имэйлийг алгасаад `skipped` жагсаалтад оруулна.
- Бусдыг нэг transaction дотор үүсгэнэ. Шинэ хэрэглэгч бүр:
  - эхний модуль нь нээлттэй;
  - `must_change_password = true`;
  - шинэ түр нууц үгтэй.
- `{ created: [{ name, email, tempPassword }], skipped: [email] }` буцаана.

**Үр дүнгийн хуудас:**
- Хүснэгт болон "Хэвлэх" товч гарна. Хэвлэхэд хүн бүрийн мэдээлэл тусдаа хайчлах хуудас болно: сайтын хаяг, нэр, имэйл, түр нууц үг.
- "Энэ хуудсыг хаасны дараа нууц үг дахин харагдахгүй" гэсэн анхааруулга байна.
- Түр нууц үгийг хаана ч хадгалахгүй.

### Түр нууц үг

- 10 тэмдэгт, `xxxxx-xxxxx` хэлбэртэй.
- Тэмдэгтүүд нь андуурагддаг `0 O o 1 l I`-ийг хассан жижиг үсэг ба тоо.
- `crypto.randomInt`-ээр үүсгэнэ.

### Багшийн самбарын хүснэгт

- **"Нууц үг шинэчлэх"** товч нь `canManageAccount(actor, target)` үнэн үед л гарна. Сервер тал мөн энэ дүрмээр шалгана.
  - `canManageAccount` дүрэм: багш зөвхөн `student`-ийг, админ `student` болон `teacher`-ийг удирдана. `admin` бүртгэлийг хэн ч энэ товчоор удирдахгүй.
  - Баталгаажуулах цонхны дараа `resetPassword` ажиллана: шинэ түр нууц үг, `must_change_password = true`, `session_version` +1, `failed_logins = 0`, `locked_until = null`.
  - Түр нууц үгийг мөрийн хажууд нэг удаа харуулна.
- **"Түгжигдсэн" тэмдэг:** `locked_until > now()` үед гарна.

## 5. Хамгаалалт

- **scrypt параметрүүд:** N=2¹⁷, r=8, p=1, keylen=64, salt=16 байт, `maxmem` 256MB.
  - Параметрүүд hash-тайгаа хамт хадгалагдана.
  - Нууц үгийг `timingSafeEqual`-ээр харьцуулна.
  - Байхгүй имэйлд ч ижил параметртэй dummy hash шалгаж хугацааг тэнцүүлнэ.
- **Нууц үгийн урт:** 8–128 тэмдэгт.
- **Түгжих:** 5 удаа буруу оруулахад 15 минут.
  - Тоолуур нь нэг `UPDATE … SET failed_logins = failed_logins + 1, locked_until = CASE … END` командаар нэмэгдэнэ.
  - Хүлээн зөвшөөрсөн эрсдэл: өөр хүн санаатайгаар бүртгэлийг түгжиж чадна. Багш нууц үгийг шинэчилж түгжээг тайлна.
- **CSRF:** NextAuth-ийн CSRF токен болон Next server action-ы origin шалгалт хамгаална.
- **`AUTH_TRUST_HOST=true`:** LAN IP-ээр хандахад NextAuth-д хэрэгтэй. `.env.example` болон README-д нэмнэ.

## 6. Тест

`node:test` ашиглана. DB шаардсан тестүүд `coding_test` сан дээр ажиллана.

- **`passwords`:**
  - hash-ийн хэлбэр;
  - зөв ба буруу нууц үг;
  - ижил нууц үгэнд өөр salt ба өөр hash;
  - түр нууц үгийн хэлбэр ба тэмдэгтүүд.
- **`parseUserList`:**
  - tab, таслал, цэг таслал;
  - хоосон мөр;
  - нэр хоосон үед имэйлээс гаргах;
  - том үсэг болон зай арилгах;
  - буруу хэлбэр, буруу домайн, давхардал (мөрийн дугаартай);
  - 201 мөр.
- **`canManageAccount`:** Эрхийн бүх хослолын хүснэгтээр шалгана.
- **`refreshToken`:**
  - мөр байхгүй бол `null`;
  - `sv` таарахгүй бол `null`;
  - `sv` байхгүй токен 0-тэй таарах;
  - `role` ба `mustChangePassword`-ийн шинэчлэлт.
- **`accounts`:**
  - **`createUsers`:** үүсгэх, алгасах, `teacher` эрх, түр нууц үгээр нэвтрэх.
  - **`verifyLogin`:** амжилттай; буруу үед тоолуур нэмэгдэх; 5 дахь удаад түгжих; түгжигдсэн үед зөв нууц үгийг ч татгалзах; түгжээ дуусах; байхгүй имэйл; `password_hash` хоосон.
  - **`resetPassword`:** шинэ нууц үг ажиллаж, хуучин нь ажиллахгүй болох; `sv` +1; түгжээ тайлагдах.
  - **`changePassword`:** одоогийн нууц үг буруу, хэт богино, хуучинтайгаа ижил үеийн алдаа; амжилттай үед `must_change = false` ба `sv` +1.
  - **`getAuthState`**, **`upsertSuperAdmin`**.
- **Гар шалгалт (built-in browser):**
  1. `create-admin` → админаар нэвтрэх → нууц үгээ заавал солих.
  2. Багш болон сурагчдыг жагсаалтаар нэмээд хэвлэх хуудсыг харах.
  3. Сурагчаар нэвтэрч нууц үгээ солих.
  4. Багш нууц үгийг шинэчлэхэд сурагчийн нээлттэй session гарах.
  5. 5 удаа буруу оруулахад түгжигдэх, шинэчлэхэд түгжээ тайлагдах.
  6. `http://192.168.1.121:3001` хаягаар нэвтрэх.

## Эрсдэл

- **NextAuth v5 (beta) Credentials:**
  - `CredentialsSignin`-ийн `code`-ийг нэвтрэх хуудас руу дамжуулах;
  - `jwt` callback-аас `null` буцаахад гаргах;
  - `proxy` дотор бүрэн instance ашиглах.
  Эдгээрийг хэрэгжүүлэлтийн эхэнд суулгасан багцын баримт бичиг болон type-аас шалгана.
- **Next 16:** Код бичихээс өмнө `node_modules/next/dist/docs/`-оос proxy болон server action-ийн хэсгийг уншина (`AGENTS.md`).
