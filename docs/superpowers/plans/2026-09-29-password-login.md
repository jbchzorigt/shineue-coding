# Имэйл + нууц үгээр нэвтрэх: хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сурагч, багш сургуулийн имэйл болон нууц үгээрээ нэвтэрдэг болгох. Багш жагсаалт буулгаж сурагчдыг нэмж, нууц үгийг нь шинэчилнэ. Нууц үг солигдоход session тэр даруй хүчингүй болно.

**Architecture:** Нууц үгийн hash (`scrypt`), түгжих тоолуур болон `session_version` баганууд `users` хүснэгтэд нэмэгдэнэ.
- NextAuth-ийн Credentials provider `verifyLogin`-ийг дуудна.
- `jwt` callback хүсэлт бүрд `getAuthState`-ийг дуудаж, цэвэр функц `refreshToken`-оор session хүчинтэй эсэхийг шийднэ.
- `proxy.ts` бүрэн `auth` instance-ийг ашиглаж, түр нууц үгтэй хэрэглэгчийг `/account/password` руу шилжүүлнэ.
- Багшийн UI нь server action-уудаар `createUsers` болон `resetPassword`-ийг дуудна.

**Tech Stack:** Next.js 16.2.10 (proxy нь Node runtime дээр), next-auth 5.0.0-beta.31, Drizzle 0.45 + Postgres 17, `node:crypto` scrypt, `node:test` + tsx.

**Spec:** `docs/superpowers/specs/2026-09-29-password-login-design.md`

## Global Constraints

- **Commit ба push ХИЙХГҮЙ.** Хэрэглэгч "final code" гэж хэлэхэд л commit хийнэ. Task бүр "Checkpoint" алхмаар төгсөнө.
- Шинэ npm dependency нэмэхгүй. Нууц үгийг `node:crypto`-ийн `scrypt`, `randomBytes`, `randomInt`, `timingSafeEqual`-ээр боловсруулна.
- scrypt: N=2¹⁷ (131072), r=8, p=1, keylen=64, salt=16 байт, `maxmem`=256MB. Хадгалах хэлбэр: `scrypt$N$r$p$salt$hash` (base64).
- Түгжих: `MAX_FAILED_LOGINS = 5`, `LOCK_MINUTES = 15`. Нууц үгийн урт: 8–128 тэмдэгт.
- Түр нууц үг: `xxxxx-xxxxx` хэлбэртэй. Үсэг тэмдэгт нь `abcdefghijkmnpqrstuvwxyz23456789` (`0 O o 1 l I` хасагдсан).
- Нэг удаад нэмэх хэрэглэгчийн дээд хэмжээ 200.
- Session: JWT, `maxAge` = 7 хоног.
- Хэрэглэгчид харагдах бүх мессеж монголоор бичигдэнэ. Server action-ууд гэнэтийн алдааг `userMessage()`-ээр дамжуулна.
- Нууц үг, түр нууц үг, cookie-г чат руу бичихгүй.
- Next-тэй холбоотой код бичихээс өмнө `node_modules/next/dist/docs/`-ийн холбогдох хэсгийг уншина (`AGENTS.md`).
- Bash командууд Git Bash дээр `D:\2026-2027 lessons\shine ue coding` хавтаснаас ажиллана. Postgres (`coding-db`) болон Piston ажиллаж байх ёстой (`npm run db:up`).

## Review Focus

1. **Excel-ээс толгой мөртэй, CRLF мөрийн төгсгөлтэй хуулсан жагсаалт.** Толгой мөрийг алгасаж, CRLF-ийг зөв задлах ёстой. Шалгах тест: Task 1, `user-list.test.ts`.
2. **Нэвтрэхдээ имэйлийг том үсэг эсвэл зайтай бичих.** Зөв нэвтрэх ёстой. Шалгах тест: Task 2, "verifyLogin accepts…".
3. **Түгжээ дууссаны дараах нэг буруу оролдлого.** Тоолуур шинээр эхэлж, дахин шууд түгжихгүй байх ёстой. Шалгах тест: Task 2, "an expired lock…".
4. **Хоёр tab эсвэл хурдан товшилтоор зэрэг буруу оролдох.** Тоолуур алдагдахгүйгээр түгжих ёстой. Шалгах тест: Task 2, "parallel wrong guesses…".
5. **Багш хүсэлтийг гараар өөрчилж багш нэмэх, эсвэл багш/админы нууц үг шинэчлэх.** Сервер татгалзах ёстой. Шалгах тест: Task 1, `canManageAccount`-ийн хүснэгт. Action-ууд энэ функцийг л ашиглана (Task 4).

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `src/lib/passwords.ts` (шинэ) | `hashPassword`, `verifyPassword`, `generateTempPassword` |
| `src/lib/user-list.ts` (шинэ) | `parseUserList`, `normalizeEmail`, `MAX_USERS_PER_PASTE` |
| `src/lib/auth-token.ts` (шинэ) | `AuthState`, `refreshToken` |
| `src/lib/types.ts` | `canManageAccount` нэмэгдэнэ |
| `src/lib/constants.ts` | `ALLOWED_DOMAIN` энд шилжинэ (`auth.config.ts` дахин экспортолно) |
| `src/lib/db/schema.ts`, `drizzle/0002_*.sql` | `users`-т 5 багана нэмэгдэнэ |
| `src/lib/db/accounts.ts` (шинэ) | `createUsers`, `verifyLogin`, `resetPassword`, `changePassword`, `getAuthState`, `upsertSuperAdmin` |
| `src/lib/db/teacher.ts` | `StudentOverview.locked` |
| `src/auth.config.ts`, `src/auth.ts`, `src/proxy.ts`, `src/types/next-auth.d.ts` | Нэвтрэлтийн холболт |
| `src/lib/auth-actions.ts` | `loginAction`, `changePasswordAction` |
| `src/components/auth/login-form.tsx`, `src/components/auth/change-password-form.tsx` (шинэ) | Client формууд |
| `src/app/login/page.tsx`, `src/app/account/password/page.tsx` (шинэ) | Хуудсууд |
| `src/components/user-menu-client.tsx` | "Нууц үг солих" цэс |
| `src/lib/account-actions.ts` (шинэ) | `createUsersAction`, `resetPasswordAction` |
| `src/app/teacher/users/new/page.tsx`, `src/components/teacher/create-users-form.tsx`, `src/components/teacher/reset-password-button.tsx` (шинэ) | Багшийн UI |
| `src/app/teacher/page.tsx` | "Хэрэглэгч нэмэх" товч, "Үйлдэл" багана, "Түгжигдсэн" тэмдэг |
| `scripts/create-admin.ts` (шинэ), `scripts/make-test-session.ts`, `scripts/set-role.ts` | Скриптүүд |
| `.env.example`, `.env.local`, `README.md` | `AUTH_TRUST_HOST`, баримт бичиг |

---

### Task 1: Цэвэр функцүүд (нууц үг, жагсаалт задлах, эрх, session шийдвэр)

**Files:**
- Create: `src/lib/passwords.ts`, `src/lib/user-list.ts`, `src/lib/auth-token.ts`
- Create tests: `src/lib/passwords.test.ts`, `src/lib/user-list.test.ts`, `src/lib/auth-token.test.ts`, `src/lib/types.test.ts`
- Modify: `src/lib/types.ts`, `src/lib/constants.ts`, `src/auth.config.ts:4`

**Interfaces:**
- Produces:
  - `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, stored: string): Promise<boolean>`, `generateTempPassword(): string` (`@/lib/passwords`)
  - `normalizeEmail(raw: string): string`, `MAX_USERS_PER_PASTE = 200`, `interface ParsedUser { email: string; name: string }`, `interface UserListError { line: number; message: string }`, `type ParseResult = { ok: true; users: ParsedUser[] } | { ok: false; errors: UserListError[] }`, `parseUserList(text: string): ParseResult` (`@/lib/user-list`)
  - `interface AuthState { role: UserRole; must_change_password: boolean; session_version: number }`, `interface SessionToken { sub?: string; sv?: number; role?: UserRole; mustChangePassword?: boolean }`, `refreshToken<T extends SessionToken>(token: T, state: AuthState | null): T | null` (`@/lib/auth-token`)
  - `canManageAccount(actor: UserRole | null | undefined, target: UserRole): boolean` (`@/lib/types`)
  - `ALLOWED_DOMAIN = "shineue.edu.mn"` (`@/lib/constants`)

- [ ] **Step 1: Бүтэлгүйтэх тестүүдийг бичих**

`src/lib/passwords.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/passwords";

test("hashPassword stores scrypt parameters, salt and key", async () => {
  const stored = await hashPassword("correct horse");
  assert.match(stored, /^scrypt\$131072\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
});

test("verifyPassword accepts only the original password", async () => {
  const stored = await hashPassword("correct horse");
  assert.equal(await verifyPassword("correct horse", stored), true);
  assert.equal(await verifyPassword("correct horsE", stored), false);
  assert.equal(await verifyPassword("", stored), false);
});

test("the same password hashes differently each time (random salt)", async () => {
  const [a, b] = await Promise.all([hashPassword("same"), hashPassword("same")]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("same", b), true);
});

test("verifyPassword rejects malformed stored values instead of throwing", async () => {
  assert.equal(await verifyPassword("x", "not-a-hash"), false);
  assert.equal(await verifyPassword("x", "bcrypt$1$2$3$4$5"), false);
  assert.equal(await verifyPassword("x", "scrypt$0$8$1$AAAA$AAAA"), false);
});

test("temporary passwords are 5+5 unambiguous characters", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const p = generateTempPassword();
    assert.match(p, /^[a-km-np-z2-9]{5}-[a-km-np-z2-9]{5}$/);
    seen.add(p);
  }
  assert.equal(seen.size, 200);
});
```

`src/lib/user-list.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_USERS_PER_PASTE, parseUserList } from "@/lib/user-list";

test("tab, comma and semicolon separated rows all parse (CRLF too)", () => {
  assert.deepEqual(
    parseUserList("a@shineue.edu.mn\tБат Болд\r\nb@shineue.edu.mn, Сараа\r\nc@shineue.edu.mn;Дорж"),
    {
      ok: true,
      users: [
        { email: "a@shineue.edu.mn", name: "Бат Болд" },
        { email: "b@shineue.edu.mn", name: "Сараа" },
        { email: "c@shineue.edu.mn", name: "Дорж" },
      ],
    }
  );
});

test("emails are trimmed and lower-cased; a missing name falls back to the address", () => {
  assert.deepEqual(parseUserList("  Bat.Bold@Shineue.edu.mn  \n\n   \nsaraa@shineue.edu.mn\t\t10А анги"), {
    ok: true,
    users: [
      { email: "bat.bold@shineue.edu.mn", name: "bat.bold" },
      { email: "saraa@shineue.edu.mn", name: "saraa" },
    ],
  });
});

test("a spreadsheet header row is skipped", () => {
  assert.deepEqual(parseUserList("Имэйл\tНэр\na@shineue.edu.mn\tБат"), {
    ok: true,
    users: [{ email: "a@shineue.edu.mn", name: "Бат" }],
  });
});

test("bad rows are reported with their line numbers and nothing is accepted", () => {
  const r = parseUserList(
    "a@shineue.edu.mn\tБат\nnot-an-email\tX\nb@gmail.com\tY\nA@shineue.edu.mn\tДавхар"
  );
  assert.equal(r.ok, false);
  const errors = r.ok ? [] : r.errors;
  assert.deepEqual(errors.map((e) => e.line), [2, 3, 4]);
  assert.match(errors[0].message, /^2-р мөр: .*имэйл хаяг биш/);
  assert.match(errors[1].message, /^3-р мөр: .*@shineue\.edu\.mn/);
  assert.match(errors[2].message, /^4-р мөр: .*давхардсан/);
});

test("an empty list and an over-long list are refused", () => {
  assert.deepEqual(parseUserList(" \n\n"), {
    ok: false,
    errors: [{ line: 0, message: "Жагсаалт хоосон байна." }],
  });
  const many = Array.from(
    { length: MAX_USERS_PER_PASTE + 1 },
    (_, i) => `u${i}@shineue.edu.mn`
  ).join("\n");
  const r = parseUserList(many);
  assert.equal(r.ok, false);
  assert.match(r.ok ? "" : r.errors[0].message, /200/);
});
```

`src/lib/auth-token.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { refreshToken } from "@/lib/auth-token";

const token = { sub: "u1", sv: 2, role: "student" as const, mustChangePassword: false, name: "Бат" };

test("a session ends when the account is gone", () => {
  assert.equal(refreshToken(token, null), null);
});

test("a session ends when the password was changed or reset since sign-in", () => {
  assert.equal(
    refreshToken(token, { role: "student", must_change_password: false, session_version: 3 }),
    null
  );
});

test("a current session picks up role and the must-change flag from the database", () => {
  assert.deepEqual(
    refreshToken(token, { role: "teacher", must_change_password: true, session_version: 2 }),
    { ...token, role: "teacher", mustChangePassword: true }
  );
});

test("tokens issued before session versions existed count as version 0", () => {
  const legacy = { sub: "u1", role: "student" as const };
  assert.deepEqual(
    refreshToken(legacy, { role: "student", must_change_password: false, session_version: 0 }),
    { ...legacy, role: "student", mustChangePassword: false }
  );
  assert.equal(
    refreshToken(legacy, { role: "student", must_change_password: false, session_version: 1 }),
    null
  );
});
```

`src/lib/types.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { canManageAccount, type UserRole } from "@/lib/types";

test("teachers manage students; the admin manages students and teachers; nobody manages the admin", () => {
  const cases: [UserRole | null, UserRole, boolean][] = [
    ["student", "student", false],
    ["student", "teacher", false],
    ["student", "admin", false],
    ["teacher", "student", true],
    ["teacher", "teacher", false],
    ["teacher", "admin", false],
    ["admin", "student", true],
    ["admin", "teacher", true],
    ["admin", "admin", false],
    [null, "student", false],
  ];
  for (const [actor, target, expected] of cases) {
    assert.equal(canManageAccount(actor, target), expected, `${actor} → ${target}`);
  }
});
```

- [ ] **Step 2: Тест бүтэлгүйтэхийг шалгах**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)|Cannot find module|not a function|does not provide"`
Хүлээгдэх үр дүн: FAIL. `@/lib/passwords`, `@/lib/user-list`, `@/lib/auth-token` модулиуд байхгүй, `canManageAccount` экспортлогдоогүй гэсэн алдаа гарна.

- [ ] **Step 3: `src/lib/constants.ts`-д домайныг нэмж, `auth.config.ts`-ээс тийш шилжүүлэх**

`src/lib/constants.ts`-ийн төгсгөлд нэмнэ:

```ts

/** Only this Google Workspace domain may sign in. */
export const ALLOWED_DOMAIN = "shineue.edu.mn";
```

`src/auth.config.ts`-д хуучин код:

```ts
export const ALLOWED_DOMAIN = "shineue.edu.mn";
```

Шинэ код (login page зэрэг одоогийн import-ууд эвдрэхгүй):

```ts
import { ALLOWED_DOMAIN } from "@/lib/constants";

export { ALLOWED_DOMAIN };
```

- [ ] **Step 4: `src/lib/passwords.ts` бичих**

```ts
import "server-only";

import { randomBytes, randomInt, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// OWASP-recommended scrypt cost. Stored with every hash, so it can be
// raised later without breaking existing passwords.
const N = 2 ** 17;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
// scrypt needs 128 * N * r bytes (128 MiB here); Node's default cap is 32 MiB.
const MAX_MEM = 256 * 1024 * 1024;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** Returns `scrypt$N$r$p$salt$hash` (salt and hash base64). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAX_MEM });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  try {
    const expected = Buffer.from(keyB64, "base64");
    const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEM,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    // Corrupt parameters (e.g. N not a power of two) — never a match.
    return false;
  }
}

/** Letters and digits without look-alikes (0 O o 1 l I). */
const TEMP_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

/** `xxxxx-xxxxx` — easy to read off a printed slip. */
export function generateTempPassword(): string {
  const group = () =>
    Array.from({ length: 5 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join("");
  return `${group()}-${group()}`;
}
```

- [ ] **Step 5: `src/lib/user-list.ts` бичих**

```ts
import { ALLOWED_DOMAIN } from "@/lib/constants";

export const MAX_USERS_PER_PASTE = 200;

export interface ParsedUser {
  email: string;
  name: string;
}

export interface UserListError {
  /** 1-based line in the pasted text; 0 for list-level problems. */
  line: number;
  message: string;
}

export type ParseResult =
  | { ok: true; users: ParsedUser[] }
  | { ok: false; errors: UserListError[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Parses "email, name" rows pasted from a spreadsheet (tab, comma or
 * semicolon separated). All-or-nothing: one bad row rejects the list,
 * so a teacher never ends up with half a class created.
 */
export function parseUserList(text: string): ParseResult {
  const rows = text
    .split(/\r?\n/)
    .map((raw, i) => ({ line: i + 1, cells: raw.split(/[\t,;]/) }))
    .filter(({ cells }) => cells.join("").trim() !== "")
    // A copied header row ("Имэйл, Нэр") has no address in it.
    .filter(({ line, cells }) => !(line === 1 && !cells[0].includes("@")));

  if (rows.length === 0) {
    return { ok: false, errors: [{ line: 0, message: "Жагсаалт хоосон байна." }] };
  }
  if (rows.length > MAX_USERS_PER_PASTE) {
    return {
      ok: false,
      errors: [
        {
          line: 0,
          message: `Нэг удаад хамгийн ихдээ ${MAX_USERS_PER_PASTE} хүн нэмнэ (одоо ${rows.length}).`,
        },
      ],
    };
  }

  const users: ParsedUser[] = [];
  const errors: UserListError[] = [];
  const seen = new Set<string>();
  for (const { line, cells } of rows) {
    const email = normalizeEmail(cells[0]);
    if (!EMAIL_RE.test(email)) {
      errors.push({ line, message: `${line}-р мөр: «${cells[0].trim()}» нь имэйл хаяг биш байна.` });
    } else if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      errors.push({ line, message: `${line}-р мөр: зөвхөн @${ALLOWED_DOMAIN} хаяг зөвшөөрөгдөнө.` });
    } else if (seen.has(email)) {
      errors.push({ line, message: `${line}-р мөр: ${email} жагсаалтад давхардсан байна.` });
    } else {
      seen.add(email);
      users.push({ email, name: (cells[1] ?? "").trim() || email.split("@")[0] });
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, users };
}
```

- [ ] **Step 6: `src/lib/auth-token.ts` бичих**

```ts
import type { UserRole } from "@/lib/types";

/** The user-row fields that decide whether a session is still valid. */
export interface AuthState {
  role: UserRole;
  must_change_password: boolean;
  session_version: number;
}

export interface SessionToken {
  sub?: string;
  /** session_version the token was issued against. */
  sv?: number;
  role?: UserRole;
  mustChangePassword?: boolean;
}

/**
 * Re-validates a session against its user row on every request. A missing
 * row (deleted account) or a bumped session_version (password changed or
 * reset) ends the session; otherwise the role and must-change flag are
 * refreshed from the database, so role changes apply immediately.
 */
export function refreshToken<T extends SessionToken>(token: T, state: AuthState | null): T | null {
  if (!state) return null;
  if ((token.sv ?? 0) !== state.session_version) return null;
  return { ...token, role: state.role, mustChangePassword: state.must_change_password };
}
```

- [ ] **Step 7: `src/lib/types.ts`-д `canManageAccount` нэмэх**

`isStaff` функцийн дараа нэмнэ:

```ts

/**
 * Who may create accounts for, or reset the password of, whom: teachers
 * handle students, the admin handles students and teachers, and the admin
 * account itself is only managed by scripts/create-admin.ts.
 */
export function canManageAccount(actor: UserRole | null | undefined, target: UserRole): boolean {
  if (target === "student") return isStaff(actor);
  if (target === "teacher") return actor === "admin";
  return false;
}
```

- [ ] **Step 8: Тест давахыг шалгах**

Run: `npx tsc --noEmit -p . && npm test 2>&1 | grep -E "ℹ (tests|pass|fail)|^\s*✖"`
Хүлээгдэх үр дүн: tsc алдаагүй. Тест нь 57 + 5 + 5 + 4 + 1 = **72 pass, 0 fail**.

- [ ] **Step 9: Checkpoint**

Run: `git status --short src/lib`

---

### Task 2: Өгөгдөл: schema, migration, `accounts.ts`, `locked`

**Files:**
- Modify: `src/lib/db/schema.ts` (`users`), `src/lib/db/teacher.ts`, `src/lib/db/teacher.test.ts`
- Create: `src/lib/db/accounts.ts`, `src/lib/db/accounts.test.ts`, `drizzle/0002_*.sql` (үүсгэгдэнэ)

**Interfaces:**
- Consumes: Task 1-ийн бүх экспорт. Мөн өмнөх ажлаас: `getDb`, `newId`, `getFirstModuleId`, `FIRST_MODULE_ID`, `SUPER_ADMIN_EMAIL`, `UserError`, `NotFoundError`.
- Produces (`@/lib/db/accounts`):
  - `MAX_FAILED_LOGINS = 5`, `LOCK_MINUTES = 15`, `MIN_PASSWORD_LENGTH = 8`, `MAX_PASSWORD_LENGTH = 128`
  - `interface CreatedUser { name: string; email: string; tempPassword: string }`
  - `createUsers(people: ParsedUser[], role: "student" | "teacher"): Promise<{ created: CreatedUser[]; skipped: string[] }>`
  - `type LoginResult = { ok: true; user: { uid: string; email: string; name: string | null } } | { ok: false; reason: "invalid" | "locked" }`
  - `verifyLogin(email: string, password: string): Promise<LoginResult>`
  - `getAuthState(uid: string): Promise<AuthState | null>`
  - `resetPassword(uid: string): Promise<string>` (түр нууц үг)
  - `changePassword(uid: string, currentPassword: string, newPassword: string): Promise<void>`
  - `upsertSuperAdmin(email: string): Promise<string>` (түр нууц үг)
  - `StudentOverview.locked: boolean` (`@/lib/db/teacher`)

- [ ] **Step 1: Бүтэлгүйтэх тест бичих: `src/lib/db/accounts.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import {
  changePassword,
  createUsers,
  getAuthState,
  MAX_FAILED_LOGINS,
  resetPassword,
  upsertSuperAdmin,
  verifyLogin,
} from "@/lib/db/accounts";
import { hashPassword } from "@/lib/passwords";
import { NotFoundError, UserError } from "@/lib/errors";

beforeEach(async () => {
  await resetDb();
  await addModule("module-01", 1);
});
after(closeDb);

async function row(uid: string) {
  const [r] = await getDb().select().from(users).where(eq(users.uid, uid));
  return r;
}

async function byEmail(email: string) {
  const [r] = await getDb().select().from(users).where(eq(users.email, email));
  return r;
}

async function addPasswordUser(
  uid: string,
  password: string,
  fields: Partial<typeof users.$inferInsert> = {}
) {
  await addUser(uid, { password_hash: await hashPassword(password), ...fields });
}

test("createUsers creates students who must change their temporary password", async () => {
  const { created, skipped } = await createUsers(
    [
      { email: "a@shineue.edu.mn", name: "А" },
      { email: "b@shineue.edu.mn", name: "Б" },
    ],
    "student"
  );
  assert.deepEqual(skipped, []);
  assert.deepEqual(created.map((c) => c.email), ["a@shineue.edu.mn", "b@shineue.edu.mn"]);
  const a = await byEmail("a@shineue.edu.mn");
  assert.equal(a.role, "student");
  assert.equal(a.name, "А");
  assert.equal(a.must_change_password, true);
  assert.deepEqual(a.unlocked_modules, ["module-01"]);
  assert.match(a.uid, /^[A-Za-z0-9]{20}$/);
  assert.equal((await verifyLogin("a@shineue.edu.mn", created[0].tempPassword)).ok, true);
});

test("createUsers skips existing emails without touching them, and can create teachers", async () => {
  await addUser("old", { email: "a@shineue.edu.mn", name: "Хуучин" });
  const r = await createUsers(
    [
      { email: "a@shineue.edu.mn", name: "А" },
      { email: "t@shineue.edu.mn", name: "Т" },
    ],
    "teacher"
  );
  assert.deepEqual(r.skipped, ["a@shineue.edu.mn"]);
  assert.deepEqual(r.created.map((c) => c.email), ["t@shineue.edu.mn"]);
  assert.equal((await row("old")).name, "Хуучин");
  assert.equal((await byEmail("t@shineue.edu.mn")).role, "teacher");
});

test("verifyLogin accepts the right password whatever the email's case or spacing", async () => {
  await addPasswordUser("u1", "correct horse", { failed_logins: 3 });
  assert.deepEqual(await verifyLogin("  U1@Shineue.edu.mn ", "correct horse"), {
    ok: true,
    user: { uid: "u1", email: "u1@shineue.edu.mn", name: "u1" },
  });
  assert.equal((await row("u1")).failed_logins, 0);
});

test("wrong passwords count up; the fifth locks the account even against the right one", async () => {
  await addPasswordUser("u1", "correct horse");
  for (let i = 1; i < MAX_FAILED_LOGINS; i++) {
    assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "wrong"), { ok: false, reason: "invalid" });
  }
  assert.equal((await row("u1")).locked_until, null);
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "wrong"), { ok: false, reason: "invalid" });
  assert.ok((await row("u1")).locked_until! > new Date());
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "correct horse"), {
    ok: false,
    reason: "locked",
  });
});

test("parallel wrong guesses still lock the account", async () => {
  await addPasswordUser("u1", "correct horse");
  await Promise.all(
    Array.from({ length: MAX_FAILED_LOGINS }, () => verifyLogin("u1@shineue.edu.mn", "wrong"))
  );
  const r = await row("u1");
  assert.equal(r.failed_logins, MAX_FAILED_LOGINS);
  assert.ok(r.locked_until! > new Date());
});

test("an expired lock starts a fresh count", async () => {
  await addPasswordUser("u1", "correct horse", {
    failed_logins: MAX_FAILED_LOGINS,
    locked_until: new Date(Date.now() - 1000),
  });
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "wrong"), { ok: false, reason: "invalid" });
  const r = await row("u1");
  assert.equal(r.failed_logins, 1);
  assert.equal(r.locked_until, null);
  assert.equal((await verifyLogin("u1@shineue.edu.mn", "correct horse")).ok, true);
});

test("unknown emails and accounts without a password are rejected alike", async () => {
  await addUser("g1");
  assert.deepEqual(await verifyLogin("nobody@shineue.edu.mn", "x"), { ok: false, reason: "invalid" });
  assert.deepEqual(await verifyLogin("g1@shineue.edu.mn", "x"), { ok: false, reason: "invalid" });
});

test("resetPassword issues a working temporary password, ends sessions and unlocks", async () => {
  await addPasswordUser("u1", "old password", {
    failed_logins: MAX_FAILED_LOGINS,
    locked_until: new Date(Date.now() + 60_000),
    session_version: 2,
  });
  const temp = await resetPassword("u1");
  assert.match(temp, /^[a-km-np-z2-9]{5}-[a-km-np-z2-9]{5}$/);
  const r = await row("u1");
  assert.equal(r.session_version, 3);
  assert.equal(r.must_change_password, true);
  assert.equal(r.failed_logins, 0);
  assert.equal(r.locked_until, null);
  assert.equal((await verifyLogin("u1@shineue.edu.mn", temp)).ok, true);
  assert.deepEqual(await verifyLogin("u1@shineue.edu.mn", "old password"), {
    ok: false,
    reason: "invalid",
  });
  await assert.rejects(resetPassword("nobody"), (err) => err instanceof NotFoundError);
});

test("changePassword validates, then clears the must-change flag and ends other sessions", async () => {
  await addPasswordUser("u1", "temp-pass1", { must_change_password: true });
  await assert.rejects(
    changePassword("u1", "wrong", "new password 1"),
    (err) => err instanceof UserError && /Одоогийн нууц үг буруу/.test(err.message)
  );
  await assert.rejects(
    changePassword("u1", "temp-pass1", "short"),
    (err) => err instanceof UserError && /8–128/.test(err.message)
  );
  await assert.rejects(
    changePassword("u1", "temp-pass1", "temp-pass1"),
    (err) => err instanceof UserError && /хуучинтайгаа ижил/.test(err.message)
  );
  await changePassword("u1", "temp-pass1", "new password 1");
  const r = await row("u1");
  assert.equal(r.must_change_password, false);
  assert.equal(r.session_version, 1);
  assert.equal((await verifyLogin("u1@shineue.edu.mn", "new password 1")).ok, true);
});

test("getAuthState returns what the session check needs", async () => {
  await addUser("u1", { role: "teacher", must_change_password: true, session_version: 4 });
  assert.deepEqual(await getAuthState("u1"), {
    role: "teacher",
    must_change_password: true,
    session_version: 4,
  });
  assert.equal(await getAuthState("nobody"), null);
});

test("upsertSuperAdmin creates the admin, and a rerun resets its password on the same account", async () => {
  const first = await upsertSuperAdmin("Boss@Shineue.edu.mn");
  const a = await byEmail("boss@shineue.edu.mn");
  assert.equal(a.role, "admin");
  assert.equal(a.must_change_password, true);
  assert.equal((await verifyLogin("boss@shineue.edu.mn", first)).ok, true);

  const second = await upsertSuperAdmin("boss@shineue.edu.mn");
  const b = await byEmail("boss@shineue.edu.mn");
  assert.equal(b.uid, a.uid);
  assert.equal(b.session_version, a.session_version + 1);
  assert.deepEqual(await verifyLogin("boss@shineue.edu.mn", first), { ok: false, reason: "invalid" });
  assert.equal((await verifyLogin("boss@shineue.edu.mn", second)).ok, true);
});
```

- [ ] **Step 2: `teacher.test.ts`-ийг `locked` талбартай болгох (бүтэлгүйтэх тест)**

Эхний тестийн хүлээгдэх объектод `hints_used: 1,` мөрийн дараа `locked: false,` нэмнэ. Хуучин код:

```ts
      hints_used: 1,
      last_login: null,
    }
  );
```

Шинэ код:

```ts
      hints_used: 1,
      locked: false,
      last_login: null,
    }
  );
```

Файлын төгсгөлд нэмнэ:

```ts

test("locked accounts are flagged until the lock expires", async () => {
  await addUser("s1", { locked_until: new Date(Date.now() + 60_000) });
  await addUser("s2", { locked_until: new Date(Date.now() - 60_000) });
  const rows = await listStudentOverviews();
  assert.deepEqual(
    rows.map((r) => [r.uid, r.locked]).sort(),
    [
      ["s1", true],
      ["s2", false],
    ]
  );
});
```

- [ ] **Step 3: Тест бүтэлгүйтэхийг шалгах**

Run: `npm test 2>&1 | grep -E "ℹ (tests|pass|fail)|Cannot find module|^\s*✖ "`
Хүлээгдэх үр дүн: FAIL. `@/lib/db/accounts` олдохгүй, `teacher.test.ts` нь `locked`-ийн улмаас унана.

- [ ] **Step 4: `schema.ts`-д баганууд нэмэх**

`users` дотор `last_login_at` мөрийн дараа нэмнэ:

```ts
    /** `scrypt$N$r$p$salt$hash`; null = no password sign-in (Google-only row). */
    password_hash: text("password_hash"),
    /** Set on create/reset — the proxy holds the user on /account/password. */
    must_change_password: boolean("must_change_password").notNull().default(false),
    /** Bumped on every password change/reset; older sessions stop validating. */
    session_version: integer("session_version").notNull().default(0),
    failed_logins: integer("failed_logins").notNull().default(0),
    locked_until: timestamp("locked_until", tz),
```

Run: `npm run -s db:generate && cat drizzle/0002_*.sql`
Хүлээгдэх үр дүн: `ALTER TABLE "users" ADD COLUMN …` гэсэн 5 мөр (`password_hash`, `must_change_password` (DEFAULT false NOT NULL), `session_version` (DEFAULT 0 NOT NULL), `failed_logins` (DEFAULT 0 NOT NULL), `locked_until`).

- [ ] **Step 5: `src/lib/db/accounts.ts` бичих**

```ts
import "server-only";

import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { getFirstModuleId } from "@/lib/db/modules";
import { users } from "@/lib/db/schema";
import { FIRST_MODULE_ID } from "@/lib/constants";
import { NotFoundError, UserError } from "@/lib/errors";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/passwords";
import { normalizeEmail, type ParsedUser } from "@/lib/user-list";
import type { AuthState } from "@/lib/auth-token";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export interface CreatedUser {
  name: string;
  email: string;
  tempPassword: string;
}

/**
 * Creates accounts for people already validated by parseUserList. Existing
 * emails are skipped, never overwritten. Temporary passwords are returned
 * once and not stored anywhere in plain text.
 */
export async function createUsers(
  people: ParsedUser[],
  role: "student" | "teacher"
): Promise<{ created: CreatedUser[]; skipped: string[] }> {
  const db = getDb();
  const emails = people.map((p) => p.email);
  const existing = emails.length
    ? await db.select({ email: users.email }).from(users).where(inArray(users.email, emails))
    : [];
  const taken = new Set(existing.map((r) => r.email));
  const firstModule = (await getFirstModuleId()) ?? FIRST_MODULE_ID;

  // Hashing is deliberately slow; Node runs these on its thread pool in parallel.
  const prepared = await Promise.all(
    people
      .filter((p) => !taken.has(p.email))
      .map(async (p) => {
        const tempPassword = generateTempPassword();
        return { ...p, tempPassword, hash: await hashPassword(tempPassword) };
      })
  );

  // One statement, so the batch is atomic; a concurrent insert of the same
  // email is skipped instead of failing everything.
  const inserted = prepared.length
    ? await db
        .insert(users)
        .values(
          prepared.map((p) => ({
            uid: newId(),
            email: p.email,
            name: p.name,
            role,
            unlocked_modules: [firstModule],
            password_hash: p.hash,
            must_change_password: true,
          }))
        )
        .onConflictDoNothing({ target: users.email })
        .returning({ email: users.email })
    : [];
  const done = new Set(inserted.map((r) => r.email));

  return {
    created: prepared
      .filter((p) => done.has(p.email))
      .map(({ name, email, tempPassword }) => ({ name, email, tempPassword })),
    skipped: emails.filter((e) => !done.has(e)),
  };
}

export type LoginResult =
  | { ok: true; user: { uid: string; email: string; name: string | null } }
  | { ok: false; reason: "invalid" | "locked" };

let dummyHash: Promise<string> | undefined;

export async function verifyLogin(email: string, password: string): Promise<LoginResult> {
  const db = getDb();
  const [row] = await db
    .select({
      uid: users.uid,
      email: users.email,
      name: users.name,
      password_hash: users.password_hash,
      locked_until: users.locked_until,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  if (row?.locked_until) {
    if (row.locked_until > new Date()) return { ok: false, reason: "locked" };
    // The lock ran out: start counting afresh.
    await db.update(users).set({ failed_logins: 0, locked_until: null }).where(eq(users.uid, row.uid));
  }

  if (!row?.password_hash) {
    // Same work as a real check, so timing does not reveal which emails exist.
    await verifyPassword(password, await (dummyHash ??= hashPassword("timing-equaliser")));
    return { ok: false, reason: "invalid" };
  }

  if (!(await verifyPassword(password, row.password_hash))) {
    // One atomic statement: concurrent wrong guesses are all counted.
    await db
      .update(users)
      .set({
        failed_logins: sql`${users.failed_logins} + 1`,
        locked_until: sql`case when ${users.failed_logins} + 1 >= ${MAX_FAILED_LOGINS}
          then now() + make_interval(mins => ${LOCK_MINUTES}) end`,
      })
      .where(eq(users.uid, row.uid));
    return { ok: false, reason: "invalid" };
  }

  await db
    .update(users)
    .set({ failed_logins: 0, locked_until: null, last_login_at: sql`now()` })
    .where(eq(users.uid, row.uid));
  return { ok: true, user: { uid: row.uid, email: row.email, name: row.name } };
}

export async function getAuthState(uid: string): Promise<AuthState | null> {
  const [row] = await getDb()
    .select({
      role: users.role,
      must_change_password: users.must_change_password,
      session_version: users.session_version,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  return row ?? null;
}

/** New temporary password; ends every session of the user and unlocks them. */
export async function resetPassword(uid: string): Promise<string> {
  const tempPassword = generateTempPassword();
  const updated = await getDb()
    .update(users)
    .set({
      password_hash: await hashPassword(tempPassword),
      must_change_password: true,
      session_version: sql`${users.session_version} + 1`,
      failed_logins: 0,
      locked_until: null,
    })
    .where(eq(users.uid, uid))
    .returning({ uid: users.uid });
  if (updated.length === 0) throw new NotFoundError("Хэрэглэгч олдсонгүй.");
  return tempPassword;
}

export async function changePassword(
  uid: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH || newPassword.length > MAX_PASSWORD_LENGTH) {
    throw new UserError(
      `Шинэ нууц үг ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} тэмдэгт байх ёстой.`
    );
  }
  if (newPassword === currentPassword) {
    throw new UserError("Шинэ нууц үг хуучинтайгаа ижил байж болохгүй.");
  }
  const db = getDb();
  const [row] = await db
    .select({ password_hash: users.password_hash })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);
  if (!row?.password_hash || !(await verifyPassword(currentPassword, row.password_hash))) {
    throw new UserError("Одоогийн нууц үг буруу байна.");
  }
  await db
    .update(users)
    .set({
      password_hash: await hashPassword(newPassword),
      must_change_password: false,
      // Signs out every other device; the caller signs this one back in.
      session_version: sql`${users.session_version} + 1`,
      failed_logins: 0,
      locked_until: null,
    })
    .where(eq(users.uid, uid));
}

/**
 * Creates the super admin, or — on a rerun — resets its password (the
 * recovery path when it is forgotten). Returns a one-time temporary password.
 */
export async function upsertSuperAdmin(email: string): Promise<string> {
  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  const firstModule = (await getFirstModuleId()) ?? FIRST_MODULE_ID;
  await getDb()
    .insert(users)
    .values({
      uid: newId(),
      email: normalizeEmail(email),
      name: "Админ",
      role: "admin",
      unlocked_modules: [firstModule],
      password_hash: hash,
      must_change_password: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        role: "admin",
        password_hash: hash,
        must_change_password: true,
        session_version: sql`${users.session_version} + 1`,
        failed_logins: 0,
        locked_until: null,
      },
    });
  return tempPassword;
}
```

- [ ] **Step 6: `teacher.ts`-д `locked` нэмэх**

`StudentOverview` interface-д `hints_used: number;` мөрийн дараа нэмнэ:

```ts
  /** Too many wrong passwords; a password reset unlocks. */
  locked: boolean;
```

`select({...})` дотор `hints_used: …` мөрийн дараа нэмнэ:

```ts
      locked: sql<boolean>`coalesce(${users.locked_until} > now(), false)`,
```

- [ ] **Step 7: Migration-ыг dev руу хэрэглэж, тест ажиллуулах**

Run: `npm run -s db:migrate && npx tsc --noEmit -p . && npm test 2>&1 | grep -E "ℹ (tests|pass|fail)|^\s*✖"`
Хүлээгдэх үр дүн: `migrations applied to DATABASE_URL`, tsc алдаагүй. Тест нь 72 + 11 (accounts) + 1 (teacher) = **84 pass, 0 fail**.

- [ ] **Step 8: Checkpoint**

Run: `git status --short src/lib/db drizzle`

---

### Task 3: Нэвтрэлтийн холболт (session, proxy, нэвтрэх ба нууц үг солих хуудас)

**Files:**
- Modify: `src/auth.config.ts`, `src/auth.ts`, `src/proxy.ts`, `src/types/next-auth.d.ts`, `src/lib/auth-actions.ts`, `src/app/login/page.tsx`, `src/components/user-menu-client.tsx`, `scripts/make-test-session.ts`, `scripts/set-role.ts`, `.env.example`, `.env.local`
- Create: `src/components/auth/login-form.tsx`, `src/components/auth/change-password-form.tsx`, `src/app/account/password/page.tsx`, `scripts/create-admin.ts`

**Interfaces:**
- Consumes: `verifyLogin`, `getAuthState`, `changePassword`, `upsertSuperAdmin` (Task 2), `refreshToken` (Task 1), `userMessage` (`@/lib/errors`)
- Produces:
  - `googleEnabled: boolean` ба `PASSWORD_PAGE = "/account/password"` (`@/auth.config`)
  - `interface FormState { error: string | null }`, `loginAction(prev: FormState, form: FormData): Promise<FormState>`, `changePasswordAction(prev: FormState, form: FormData): Promise<FormState>` (`@/lib/auth-actions`)
  - `session.user.mustChangePassword: boolean`

Энэ task-ийн нэгж тест нь Task 1–2-ийн функцүүд. Энд хийх зүйл нь тэдгээрийг холбох бөгөөд `tsc` болон гар шалгалтаар (Step 11–12) баталгаажуулна.

- [ ] **Step 1: Next баримт бичгийг унших**

Run: `sed -n 1,80p node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
Proxy файл нь `proxy` нэртэй функц экспортлох ёстойг, мөн Node runtime (221-р мөр) дээр ажилладгийг баталгаажуулна.

- [ ] **Step 2: `src/types/next-auth.d.ts`-ийг бүхэлд нь солих**

```ts
import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      /** users.uid primary key (random id, or the Google account id). */
      id: string;
      role: UserRole;
      /** Temporary password — the proxy holds the user on /account/password. */
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    /** session_version the token was issued against (see auth-token.ts). */
    sv?: number;
    mustChangePassword?: boolean;
  }
}
```

- [ ] **Step 3: `src/auth.config.ts`-ийг бүхэлд нь солих**

```ts
import type { NextAuthConfig } from "next-auth";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { ALLOWED_DOMAIN } from "@/lib/constants";

export { ALLOWED_DOMAIN };

/** Google sign-in is optional: on only when both OAuth credentials are set. */
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

/** Where a user with a temporary password is held until they change it. */
export const PASSWORD_PAGE = "/account/password";

/**
 * Settings the full instance in src/auth.ts builds on. No database access
 * here — the email/password provider and the per-request session check
 * live in src/auth.ts.
 */
export const authConfig = {
  providers: googleEnabled
    ? [
        Google({
          authorization: {
            params: {
              // Hint for Google's account picker only — a crafted request can
              // omit it, so the real enforcement lives in the signIn callback.
              hd: ALLOWED_DOMAIN,
              prompt: "select_account",
            },
          },
        }),
      ]
    : [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    // Shared school computers: a forgotten session should not live for a month.
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    signIn({ account, profile }) {
      // Email + password was already verified in authorize().
      if (account?.provider === "credentials") return true;
      if (account?.provider !== "google") return false;

      const google = profile as GoogleProfile | undefined;
      if (!google?.email_verified) return false;

      // `hd` is only issued for Google Workspace accounts, so this both
      // pins the domain and rejects personal Gmail accounts.
      return (
        google.hd === ALLOWED_DOMAIN &&
        (google.email ?? "").endsWith(`@${ALLOWED_DOMAIN}`)
      );
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role ?? "student";
      session.user.mustChangePassword = token.mustChangePassword === true;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // A temporary password must be replaced before anything else.
      if (auth?.user?.mustChangePassword && pathname !== PASSWORD_PAGE) {
        return Response.redirect(new URL(PASSWORD_PAGE, request.nextUrl));
      }

      // Public pages: landing (news showcase), news reading, and
      // certificate verification.
      if (pathname === "/") return true;
      if (pathname.startsWith("/news")) return true;
      if (pathname.startsWith("/verify")) return true;

      const isLoginPage = pathname.startsWith("/login");

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
```

- [ ] **Step 4: `src/auth.ts`-ийг бүхэлд нь солих**

```ts
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { refreshToken } from "@/lib/auth-token";
import { getAuthState, verifyLogin } from "@/lib/db/accounts";
import { ensureUserProfile, isEmailTakenByAnotherUser } from "@/lib/db/users";

/** Reaches the login form as `error.code === "locked"`. */
class AccountLocked extends CredentialsSignin {
  code = "locked";
}

/**
 * The one auth instance: pages, API routes, server actions and the proxy
 * (which runs on the Node.js runtime in Next 16, so it can reach the DB).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const result = await verifyLogin(email, password);
        if (result.ok) {
          return { id: result.user.uid, email: result.user.email, name: result.user.name };
        }
        if (result.reason === "locked") throw new AccountLocked();
        return null;
      },
    }),
    ...authConfig.providers,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn(params) {
      // Domain and verification rules first (shared config).
      if (!authConfig.callbacks.signIn(params)) return false;
      // A recreated Workspace account keeps its address but gets a new
      // Google id — explain on the login page instead of failing later.
      if (params.account?.provider === "google") {
        const email = params.profile?.email;
        const uid = params.account.providerAccountId;
        if (email && (await isEmailTakenByAnotherUser(uid, email))) {
          return "/login?error=AccountConflict";
        }
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "credentials" && user?.id) {
        token.sub = user.id;
      } else if (account?.provider === "google") {
        // Google's stable account id, not NextAuth's per-sign-in UUID.
        token.sub = account.providerAccountId;
        await ensureUserProfile({
          uid: account.providerAccountId,
          email: profile?.email ?? "",
          name: profile?.name ?? null,
          photo_url: typeof profile?.picture === "string" ? profile.picture : null,
        });
      }
      if (!token.sub) return null;

      // Every request: a deleted account or a changed/reset password ends
      // the session; role and the must-change flag come fresh from the DB.
      const state = await getAuthState(token.sub);
      if (account) token.sv = state?.session_version;
      return refreshToken(token, state);
    },
  },
});
```

- [ ] **Step 5: `src/proxy.ts`-ийг бүхэлд нь солих**

```ts
import { auth } from "@/auth";

// The full instance: Next 16 runs the proxy on the Node.js runtime, so the
// jwt callback re-checks every session against the database here, and the
// authorized callback (auth.config.ts) holds users with a temporary
// password on /account/password.
export const proxy = auth;

export const config = {
  // Protect everything except NextAuth routes, static assets and files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
```

- [ ] **Step 6: `src/lib/auth-actions.ts`-ийг бүхэлд нь солих**

```ts
"use server";

import { CredentialsSignin } from "next-auth";
import { auth, signIn, signOut } from "@/auth";
import { changePassword } from "@/lib/db/accounts";
import { userMessage } from "@/lib/errors";

export interface FormState {
  error: string | null;
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      return {
        error:
          err.code === "locked"
            ? "Олон удаа буруу оруулсан тул 15 минут түгжигдлээ. Багшдаа хандана уу."
            : "Имэйл эсвэл нууц үг буруу байна.",
      };
    }
    throw err; // includes the redirect thrown on success
  }
  return { error: null };
}

export async function changePasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return { error: "Нэвтрээгүй байна." };

  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) {
    return { error: "Шинэ нууц үгүүд таарахгүй байна." };
  }
  try {
    await changePassword(session.user.id, current, next);
  } catch (err) {
    return { error: userMessage(err) };
  }
  // The change bumped session_version, which ends this session too — sign
  // straight back in with the new password.
  await signIn("credentials", { email: session.user.email, password: next, redirectTo: "/" });
  return { error: null };
}
```

- [ ] **Step 7: `src/components/auth/login-form.tsx` үүсгэх**

```tsx
"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction, type FormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {
    error: null,
  });

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">Сургуулийн имэйл</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="нэр@shineue.edu.mn"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Нууц үг</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        <LogIn className="size-4" />
        {pending ? "Шалгаж байна…" : "Нэвтрэх"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: `src/app/login/page.tsx`-ийг бүхэлд нь солих**

```tsx
import { signIn } from "@/auth";
import { ALLOWED_DOMAIN, googleEnabled } from "@/auth.config";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">IBDP Computer Science</CardTitle>
          <CardDescription>2027 хөтөлбөрийн дасгал, сорилын платформ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Errors below come back from the optional Google sign-in. */}
          {error === "AccessDenied" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Зөвхөн сургуулийн <strong>@{ALLOWED_DOMAIN}</strong> имэйл хаягаар нэвтрэх боломжтой.
            </p>
          )}
          {error === "AccountConflict" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Энэ имэйл хаяг өөр Google бүртгэлтэй холбогдсон байна. Админд хандаж хуучин
              бүртгэлийг устгуулаад дахин нэвтэрнэ үү.
            </p>
          )}
          {error && error !== "AccessDenied" && error !== "AccountConflict" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.
            </p>
          )}

          <LoginForm />

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                эсвэл
                <span className="h-px flex-1 bg-border" />
              </div>
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  <GoogleIcon />
                  Google-ээр нэвтрэх
                </Button>
              </form>
            </>
          )}
        </CardContent>
        <CardFooter>
          <p className="w-full text-center text-xs text-muted-foreground">
            Нууц үгээ мартсан бол багшдаа хандана уу.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a6 6 0 1 1 0-12c1.5 0 2.9.55 3.95 1.55l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.4-.1-.75-.3-1.1Z"
      />
    </svg>
  );
}
```

- [ ] **Step 9: Нууц үг солих хуудас ба формыг үүсгэх**

`src/components/auth/change-password-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {
    error: null,
  });

  return (
    <form action={action} className="space-y-3">
      <Field id="current" label="Одоогийн (эсвэл түр) нууц үг" autoComplete="current-password" />
      <Field id="next" label="Шинэ нууц үг (8+ тэмдэгт)" autoComplete="new-password" minLength={8} />
      <Field id="confirm" label="Шинэ нууц үгээ давтах" autoComplete="new-password" minLength={8} />
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Хадгалж байна…" : "Нууц үг солих"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        required
      />
    </div>
  );
}
```

`src/app/account/password/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const forced = session.user.mustChangePassword;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Нууц үг солих
          </CardTitle>
          <CardDescription>
            {forced
              ? "Түр нууц үгээр нэвтэрсэн байна. Үргэлжлүүлэхийн өмнө өөрийн нууц үгийг тохируулна уу."
              : session.user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ChangePasswordForm />
          <div className="flex gap-2">
            {!forced && (
              <Button render={<Link href="/" />} nativeButton={false} variant="ghost" className="flex-1">
                Буцах
              </Button>
            )}
            <form action={signOutAction} className="flex-1">
              <Button type="submit" variant="ghost" className="w-full">
                Гарах
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 10: Цэс, скриптүүд, env-ийг шинэчлэх**

10a. `src/components/user-menu-client.tsx`:
- `import { LogOut } from "lucide-react";`-ийг `import { KeyRound, LogOut } from "lucide-react";` болгоно.
- Дараах мөрийг нэмнэ: `import Link from "next/link";`.
- `<DropdownMenuSeparator />`-ийн дараа, "Гарах" item-ийн өмнө нэмнэ:

```tsx
        <DropdownMenuItem render={<Link href="/account/password" />}>
          <KeyRound className="size-4" />
          Нууц үг солих
        </DropdownMenuItem>
```

10b. `scripts/create-admin.ts` үүсгэх:

```ts
/**
 * Creates the super admin (SUPER_ADMIN_EMAIL), or resets its password when
 * it is forgotten, and prints a one-time temporary password. The admin
 * must choose their own password at first sign-in.
 * Run: npm run script -- scripts/create-admin.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertSuperAdmin } from "../src/lib/db/accounts";
import { SUPER_ADMIN_EMAIL } from "../src/lib/constants";

async function main() {
  const tempPassword = await upsertSuperAdmin(SUPER_ADMIN_EMAIL);
  console.log(`Super admin: ${SUPER_ADMIN_EMAIL}`);
  console.log(`Temporary password (shown once): ${tempPassword}`);
  console.log("Sign in at /login, then choose your own password.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

10c. `scripts/make-test-session.ts`: Токен нь одоогийн `session_version`-той таарах ёстой, эс бөгөөс proxy шууд гаргана.
- `import { deleteUserCascade, ensureUserProfile, updateUserRole } from "../src/lib/db/users";` мөрийн дараа нэмнэ: `import { getAuthState } from "../src/lib/db/accounts";`.
- `const cookie = await encode({` блокийн өмнө нэмнэ: `const state = await getAuthState(UID);`.
- `token: { sub: UID, name: NAME, email: EMAIL, role },` мөрийг дараахаар солино: `token: { sub: UID, name: NAME, email: EMAIL, role, sv: state?.session_version ?? 0 },`.

10d. `scripts/set-role.ts`: Эрх одоо хүсэлт бүрд шинэчлэгддэг болсон.
- Толгойн тайлбараас хоёр мөрийг хасна: "Note: the role is copied into the session JWT at sign-in, so the user" болон "must sign out and back in to see the change in the UI.".
- `console.log("Note: the user must sign out/in for the UI to reflect the new role.");` мөрийг устгана.

10e. `.env.example`-д `AUTH_GOOGLE_SECRET=""` мөрийн дараа нэмнэ:

```

# Needed outside localhost (LAN IP, domain) — NextAuth checks the Host header.
AUTH_TRUST_HOST="true"
# Google sign-in is optional: leave AUTH_GOOGLE_ID/SECRET empty to use email + password only.
```

10f. `.env.local`-д мөр нэмнэ: `grep -q "^AUTH_TRUST_HOST=" .env.local || printf '\nAUTH_TRUST_HOST="true"\n' >> .env.local`

- [ ] **Step 11: Typecheck, lint, тест**

Run: `npx tsc --noEmit -p . && npm run lint 2>&1 | tail -2 && npm test 2>&1 | grep -E "ℹ (pass|fail)"`
Хүлээгдэх үр дүн: tsc алдаагүй. Lint-ийн алдаа 0 байна (өмнөх 2 `_form` анхааруулга үлдэнэ). Тест нь 84 pass.

- [ ] **Step 12: Гараар шалгах (session, proxy, нууц үг солих)**

Dev server-ийг дахин асаана: `preview_stop`, дараа нь `preview_start` ("dev"). Туршилтын админыг зөвхөн тест зорилгоор үүсгэнэ, жинхэнэ супер админыг хэрэглэгч өөрөө үүсгэнэ:

```bash
SUPER_ADMIN_EMAIL=ui-admin@shineue.edu.mn npm run -s script -- scripts/create-admin.ts
```

Хэвлэгдсэн түр нууц үгийг (туршилтын credential) чат руу бичихгүй.

Built-in browser дээр:
1. `/login` → хуучин туршилтын cookie байвал DB-д мөр нь байхгүй тул автоматаар гарсан байх ёстой. Нэвтрэх хуудас харагдана.
2. `ui-admin@shineue.edu.mn` болон түр нууц үгээр нэвтрэх → `/account/password` руу шилжинэ.
3. `/teacher` руу шууд орохыг оролдох → дахин `/account/password` руу буцаана.
4. Нууц үгийг шинэ туршилтын утга руу солих → `/` дээр нэвтэрсэн төлөвтэй гарна.
5. `docker exec coding-db psql -U coding -d coding -c "update users set session_version = session_version + 1 where email='ui-admin@shineue.edu.mn'"` → хуудсыг дахин ачаалахад `/login` руу шилжинэ (session хүчингүй болно).
6. Шинэ нууц үгээр дахин нэвтрэх → `/`. Цэсэнд "Нууц үг солих" харагдана.

Алхам бүрийн дараа `preview_logs` (level: error)-ийг шалгана.

- [ ] **Step 13: Checkpoint**

Run: `git status --short`

---

### Task 4: Багш ба админы удирдлага (жагсаалт буулгах, хэвлэх, нууц үг шинэчлэх)

**Files:**
- Create: `src/lib/account-actions.ts`, `src/components/teacher/create-users-form.tsx`, `src/components/teacher/reset-password-button.tsx`, `src/app/teacher/users/new/page.tsx`
- Modify: `src/app/teacher/page.tsx`

**Interfaces:**
- Consumes: `createUsers`, `resetPassword`, `CreatedUser` (Task 2), `parseUserList` (Task 1), `canManageAccount` (Task 1), `getUserProfile`, `UserError`, `userMessage`
- Produces:
  - `type CreateUsersState = { status: "idle" } | { status: "error"; errors: string[] } | { status: "done"; created: CreatedUser[]; skipped: string[] }`
  - `createUsersAction(prev: CreateUsersState, form: FormData): Promise<CreateUsersState>`
  - `interface ResetPasswordState { tempPassword: string | null; error: string | null }`
  - `resetPasswordAction(uid: string): Promise<ResetPasswordState>`

Эрхийн логикийг Task 1-ийн `canManageAccount`, өгөгдлийн логикийг Task 2-ын тестүүд хамарсан. Энэ task-ийг `tsc` болон гар шалгалтаар баталгаажуулна.

- [ ] **Step 1: `src/lib/account-actions.ts` үүсгэх**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUsers, resetPassword, type CreatedUser } from "@/lib/db/accounts";
import { getUserProfile } from "@/lib/db/users";
import { UserError, userMessage } from "@/lib/errors";
import { parseUserList } from "@/lib/user-list";
import { canManageAccount, type UserRole } from "@/lib/types";

/** The caller's role, read from the database — never trust the client. */
async function actorRole(): Promise<UserRole | null> {
  const session = await auth();
  const profile = session?.user?.id ? await getUserProfile(session.user.id) : null;
  return profile?.role ?? null;
}

export type CreateUsersState =
  | { status: "idle" }
  | { status: "error"; errors: string[] }
  | { status: "done"; created: CreatedUser[]; skipped: string[] };

export async function createUsersAction(
  _prev: CreateUsersState,
  form: FormData
): Promise<CreateUsersState> {
  try {
    const role = form.get("role") === "teacher" ? "teacher" : "student";
    if (!canManageAccount(await actorRole(), role)) {
      throw new UserError("Танд энэ эрхийн хэрэглэгч нэмэх зөвшөөрөл алга.");
    }
    const parsed = parseUserList(String(form.get("list") ?? ""));
    if (!parsed.ok) return { status: "error", errors: parsed.errors.map((e) => e.message) };

    const result = await createUsers(parsed.users, role);
    revalidatePath("/teacher");
    return { status: "done", ...result };
  } catch (err) {
    return { status: "error", errors: [userMessage(err)] };
  }
}

export interface ResetPasswordState {
  tempPassword: string | null;
  error: string | null;
}

export async function resetPasswordAction(uid: string): Promise<ResetPasswordState> {
  try {
    const target = await getUserProfile(uid);
    if (!target) throw new UserError("Хэрэглэгч олдсонгүй.");
    if (!canManageAccount(await actorRole(), target.role)) {
      throw new UserError("Танд энэ хэрэглэгчийн нууц үгийг шинэчлэх эрх алга.");
    }
    const tempPassword = await resetPassword(uid);
    revalidatePath("/teacher");
    return { tempPassword, error: null };
  } catch (err) {
    return { tempPassword: null, error: userMessage(err) };
  }
}
```

- [ ] **Step 2: `src/components/teacher/reset-password-button.tsx` үүсгэх**

```tsx
"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";

export function ResetPasswordButton({ uid, name }: { uid: string; name: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState>(
    () => resetPasswordAction(uid),
    { tempPassword: null, error: null }
  );

  return (
    <form
      action={action}
      className="inline-flex items-center gap-2"
      onSubmit={(e) => {
        if (!confirm(`«${name}»-ийн нууц үгийг шинэчлэх үү? Нээлттэй session нь гарна.`)) {
          e.preventDefault();
        }
      }}
    >
      {state.tempPassword && (
        <code
          className="rounded bg-amber-500/15 px-2 py-1 font-mono text-sm text-amber-900"
          title="Зөвхөн одоо харагдана — сурагчид өгнө үү"
        >
          {state.tempPassword}
        </code>
      )}
      {state.error && <span className="text-sm text-destructive">{state.error}</span>}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <KeyRound className="size-4" />
        Нууц үг шинэчлэх
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: `src/components/teacher/create-users-form.tsx` үүсгэх**

```tsx
"use client";

import { useActionState } from "react";
import { Printer, UserPlus } from "lucide-react";
import { createUsersAction, type CreateUsersState } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EXAMPLE = "bat.bold@shineue.edu.mn\tБат Болд\nsaraa.d@shineue.edu.mn\tСараа Дорж";

export function CreateUsersForm({ isAdmin, siteUrl }: { isAdmin: boolean; siteUrl: string }) {
  const [state, action, pending] = useActionState<CreateUsersState, FormData>(createUsersAction, {
    status: "idle",
  });

  return (
    <>
      <div className="space-y-6 print:hidden">
        <form action={action} className="space-y-4 rounded-xl border bg-background p-4">
          <div className="space-y-1.5">
            <Label htmlFor="list">Жагсаалт — мөр бүрт «имэйл, нэр»</Label>
            <Textarea
              id="list"
              name="list"
              rows={10}
              required
              placeholder={EXAMPLE}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Excel эсвэл Google Sheets-ээс имэйл, нэр гэсэн хоёр баганаа хуулж буулгана. Таслал
              эсвэл цэг таслалаар тусгаарласан мөр ч болно. Нэг удаад 200 хүртэл.
            </p>
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="role">Эрх</Label>
              <select
                id="role"
                name="role"
                defaultValue="student"
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="student">Сурагч</option>
                <option value="teacher">Багш</option>
              </select>
            </div>
          )}
          {state.status === "error" && (
            <ul
              role="alert"
              className="space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {state.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <Button type="submit" disabled={pending}>
            <UserPlus className="size-4" />
            {pending ? "Нэмж байна…" : "Нэмэх"}
          </Button>
        </form>

        {state.status === "done" && (
          <div className="space-y-3 rounded-xl border bg-background p-4">
            <p className="font-medium">
              {state.created.length} хэрэглэгч нэмэгдлээ
              {state.skipped.length > 0 &&
                `, ${state.skipped.length} нь аль хэдийн бүртгэлтэй тул алгаслаа`}
              .
            </p>
            {state.skipped.length > 0 && (
              <p className="text-sm text-muted-foreground">Алгассан: {state.skipped.join(", ")}</p>
            )}
            {state.created.length > 0 && (
              <>
                <p className="rounded-md bg-amber-500/15 p-3 text-sm text-amber-900">
                  Түр нууц үгүүд зөвхөн одоо харагдана — хуудсыг хаахаас өмнө хэвлэж аваарай.
                  Хэрэглэгч анх нэвтрэхдээ өөрийн нууц үгийг тохируулна.
                </p>
                <Button type="button" variant="outline" onClick={() => window.print()}>
                  <Printer className="size-4" />
                  Хэвлэх
                </Button>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Нэр</TableHead>
                      <TableHead>Имэйл</TableHead>
                      <TableHead>Түр нууц үг</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.created.map((u) => (
                      <TableRow key={u.email}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell className="font-mono">{u.tempPassword}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        )}
      </div>

      {/* Printed only: one cut-out slip per person. */}
      {state.status === "done" && (
        <div className="hidden print:block">
          {state.created.map((u) => (
            <div key={u.email} className="break-inside-avoid border-b border-dashed py-4 text-black">
              <p className="text-sm">IBDP Computer Science — {siteUrl}</p>
              <p className="text-lg font-semibold">{u.name}</p>
              <p>
                Имэйл: <span className="font-mono">{u.email}</span>
              </p>
              <p>
                Түр нууц үг: <span className="font-mono text-lg">{u.tempPassword}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: `src/app/teacher/users/new/page.tsx` үүсгэх**

```tsx
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/users";
import { isStaff } from "@/lib/types";
import { SiteHeader } from "@/components/site-header";
import { CreateUsersForm } from "@/components/teacher/create-users-form";
import { Button } from "@/components/ui/button";

export default async function NewUsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");
  const isAdmin = profile?.role === "admin";

  // Printed on each slip, so students know where to sign in.
  const h = await headers();
  const siteUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3001"}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8 print:p-0">
        <div className="space-y-1 print:hidden">
          <Button render={<Link href="/teacher" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Багшийн самбар
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UserPlus className="size-6" />
            Хэрэглэгч нэмэх
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Сурагч эсвэл багш нэмнэ." : "Сурагч нэмнэ."} Хүн бүрт түр нууц үг үүснэ.
          </p>
        </div>
        <CreateUsersForm isAdmin={isAdmin} siteUrl={siteUrl} />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: `src/app/teacher/page.tsx`-ийг засах**

5a. Import-ууд:
- `import { FolderKanban, GraduationCap, Lightbulb, Newspaper, Swords } from "lucide-react";`-ийг `import { FolderKanban, GraduationCap, Lightbulb, Newspaper, Swords, UserPlus } from "lucide-react";` болгоно.
- `import { isStaff } from "@/lib/types";`-ийг `import { canManageAccount, isStaff } from "@/lib/types";` болгоно.
- `import { DeleteUserButton } from "@/components/teacher/delete-user-button";` мөрийн дараа нэмнэ: `import { ResetPasswordButton } from "@/components/teacher/reset-password-button";`.

5b. "Мэдээний удирдлага" товчийг агуулсан `<Button render={<Link href="/teacher/news" />} …>…</Button>` блокийн дараа (`</div>`-ээс өмнө) нэмнэ:

```tsx
            <Button render={<Link href="/teacher/users/new" />} nativeButton={false} variant="outline">
              <UserPlus className="size-4" />
              Хэрэглэгч нэмэх
            </Button>
```

5c. Хуучин код:

```tsx
                {isAdmin && <TableHead className="text-right">Үүрэг</TableHead>}
```

Шинэ код:

```tsx
                <TableHead className="text-right">Үйлдэл</TableHead>
```

5d. `colSpan={isAdmin ? 9 : 8}`-ийг `colSpan={9}` болгоно.

5e. Админ badge-ийн `)}`-ийн дараа, `</p>`-ээс өмнө "Түгжигдсэн" тэмдгийг нэмнэ:

```tsx
                      {s.locked && (
                        <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-xs font-medium text-red-700">Түгжигдсэн</span>
                      )}
```

5f. `{isAdmin && ( <TableCell className="text-right"> … </TableCell> )}` блокийг бүхэлд нь дараахаар солино:

```tsx
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canManageAccount(profile?.role, s.role) && (
                        <ResetPasswordButton uid={s.uid} name={s.name ?? s.email} />
                      )}
                      {isAdmin && s.role !== "admin" && (
                        <>
                          <form
                            action={setUserRole.bind(
                              null,
                              s.uid,
                              s.role === "teacher" ? "student" : "teacher"
                            )}
                          >
                            <Button type="submit" variant="outline" size="sm">
                              {s.role === "teacher" ? "Сурагч болгох" : "Багш болгох"}
                            </Button>
                          </form>
                          <DeleteUserButton uid={s.uid} name={s.name} />
                        </>
                      )}
                    </div>
                  </TableCell>
```

- [ ] **Step 6: Typecheck ба lint**

Run: `npx tsc --noEmit -p . && npm run lint 2>&1 | tail -2`
Хүлээгдэх үр дүн: алдаа 0.

- [ ] **Step 7: Гараар шалгах**

Task 3-т нэвтэрсэн туршилтын админаар:
1. `/teacher` → "Хэрэглэгч нэмэх" → Эрх: Багш, жагсаалт: `ui-teacher@shineue.edu.mn<TAB>Туршилт Багш` → "1 хэрэглэгч нэмэгдлээ", хүснэгтэд түр нууц үг гарна.
2. Эрх: Сурагч. Толгой мөртэй, 2 сурагчтай жагсаалт буулгана: `Имэйл<TAB>Нэр`, `ui-s1@shineue.edu.mn<TAB>Сурагч Нэг`, `UI-S2@shineue.edu.mn, Сурагч Хоёр` → 2 хэрэглэгч нэмэгдэнэ.
   - Хэвлэх хэсэг DOM-д байгааг шалгана: `document.querySelectorAll(".print\\:block > div").length === 2`.
3. Ижил жагсаалтыг дахин илгээх → "0 хэрэглэгч нэмэгдлээ, 2 нь аль хэдийн бүртгэлтэй".
4. `ui-bad@gmail.com` мөр илгээх → "1-р мөр: зөвхөн @shineue.edu.mn …" алдаа гарч, юу ч үүсэхгүй.
5. `/teacher` хүснэгтэд 3 шинэ мөр харагдана. `ui-s1`-ийн "Нууц үг шинэчлэх" (баталгаажуулах цонхыг `window.confirm = () => true`-ээр зөвшөөрнө) → мөрийн хажууд түр нууц үг гарна.

Туршилтын түр нууц үгүүдийг scratchpad файлд хадгална, чат руу бичихгүй.

- [ ] **Step 8: Checkpoint**

Run: `git status --short`

---

### Task 5: Баримт бичиг, бүрэн шалгалт, E2E, LAN

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: Task 1–4-ийн бүх үр дүн

- [ ] **Step 1: README шинэчлэх**

1a. `## Стек` хэсэгт хуучин мөр:
`- **NextAuth v5** — Google, зөвхөн \`@shineue.edu.mn\` (сервер талд \`hd\` claim шалгана)`
Шинэ мөр:
`- **NextAuth v5** — сургуулийн имэйл + нууц үг (scrypt), Google нэвтрэлт сонголттой (\`@shineue.edu.mn\`)`

1b. Хөгжүүлэлтийн орчны код блокт `npm run db:seed` мөрийн дараа нэмнэ:
`npm run script -- scripts/create-admin.ts   # супер админ + түр нууц үг (нэг удаа хэвлэнэ)`

1c. `.env.local` хүснэгтэд `AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET` мөрийн эхний баганыг `(сонголттой)`-той болгож, хүснэгтийн төгсгөлд мөр нэмнэ:
`| \`AUTH_TRUST_HOST\` | \`"true"\` — LAN IP эсвэл домайнаар хандахад заавал |`

1d. Скриптүүдийн хүснэгтэд:
- `set-role` мөрийн тайлбараас "(дараа нь дахин нэвтэрнэ)" гэснийг хасна.
- Шинэ мөр нэмнэ: `| \`npm run script -- scripts/create-admin.ts\` | Супер админыг үүсгэх / мартсан нууц үгийг шинэчлэх (түр нууц үг хэвлэнэ) |`

1e. `## Контент нэмэх` хэсгийн өмнө шинэ хэсэг нэмнэ:

```markdown
## Хэрэглэгч ба нууц үг

- Нэвтрэх нэр нь сургуулийн имэйл хаяг. Сурагч өөрөө бүртгүүлэхгүй — багш `/teacher` → **Хэрэглэгч нэмэх** хэсэгт Excel/Sheets-ээс «имэйл, нэр» мөрүүдийг буулгана. Хүн бүрт түр нууц үг үүсч, хайчлах хуудас болгон хэвлэнэ (зөвхөн тэр үед харагдана).
- Анх нэвтрэхэд (эсвэл нууц үг шинэчлэгдсэний дараа) хэрэглэгч өөрийн нууц үгийг тохируулахаас нааш өөр хуудас руу орохгүй.
- Мартсан нууц үг: багш хүснэгтээс **Нууц үг шинэчлэх** дарна. Тэр хүний бүх session тэр даруй гарна.
- 5 удаа буруу оруулбал 15 минут түгжинэ («Түгжигдсэн» тэмдэг). Нууц үг шинэчлэхэд түгжээ тайлагдана.
- Эрх: багш — сурагч; админ — сурагч ба багш. Админы нууц үгийг зөвхөн `create-admin` скрипт шинэчилнэ.
```

1f. `## Архитектурын гол шийдвэрүүд` хэсгийн төгсгөлд нэмнэ:

```markdown
- Session (JWT, 7 хоног) хүсэлт бүрд `users`-ийн `session_version`-той тулгагдана (`src/auth.ts` → `refreshToken`): нууц үг солих/шинэчлэх, хэрэглэгч устгахад session тэр даруй дуусна; эрхийн өөрчлөлт шууд үйлчилнэ. Proxy (Next 16-д Node runtime) бүрэн auth instance ашиглана.
```

- [ ] **Step 2: Автомат шалгалтууд**

```bash
npx tsc --noEmit -p . && npm run lint && npm test && npm run build
```

Хүлээгдэх үр дүн: tsc алдаагүй. Lint-ийн алдаа 0 (2 анхааруулга үлдэнэ). Тест нь 84 pass. `next build` амжилттай (proxy bundle дотор `server-only` алдаа гарахгүй).

- [ ] **Step 3: Сурагчийн E2E (built-in browser, dev server)**

1. Гарах → `/login` → `ui-s1@shineue.edu.mn`-ээр, Task 4-т шинэчилсэн түр нууц үгээр нэвтрэх → `/account/password`.
2. Шинэ нууц үг тохируулах → `/` самбар 0 XP, 1 модультай.
3. **Session хүчингүй болгох:** Сурагч нэвтэрсэн хэвээр байхад өөр сувгаар `session_version`-ийг нэмэгдүүлнэ. Энэ нь `resetPassword` болон `changePassword`-ийн session хэсэгтэй яг ижил:
   `docker exec coding-db psql -U coding -d coding -c "update users set session_version = session_version + 1 where email='ui-s1@shineue.edu.mn'"`
   Хуудсыг дахин ачаалахад `/login` руу шилжинэ.
4. **Түгжих:** `ui-s2@shineue.edu.mn`-ээр 5 удаа буруу нууц үг оруулах. 1–4 дэх удаад "Имэйл эсвэл нууц үг буруу", 5 дахь удаад мөн адил, 6 дахь удаад (зөв нууц үгээр ч) "…15 минут түгжигдлээ" гарна.
5. Админаар нэвтэрч `/teacher` → `ui-s2` мөрөнд "Түгжигдсэн" тэмдэг харагдана → "Нууц үг шинэчлэх" → тэмдэг алга болно → шинэ түр нууц үгээр `ui-s2` нэвтэрч чадна.
6. `ui-teacher`-ээр нэвтрэх (түр нууц үг → солих) → `/teacher` дээр сурагчдын мөрөнд "Нууц үг шинэчлэх" гарна. Багш өөрийгөө болон админыг харахгүй. "Хэрэглэгч нэмэх" хуудсанд "Эрх" сонголт гарахгүй.

- [ ] **Step 4: LAN (production build)**

```bash
npx next start -p 3002
```

(`run_in_background`.) Built-in browser дээр `http://192.168.1.121:3002/login` → `ui-s1` (Step 3-т тохируулсан нууц үгээр) нэвтрэх → `/` самбар харагдана. `AUTH_TRUST_HOST` ажиллаж байгааг, `UntrustedHost` алдаа гарахгүйг баталгаажуулна. Дараа нь background процессыг зогсооно.

- [ ] **Step 5: Цэвэрлэгээ**

```bash
docker exec coding-db psql -U coding -d coding -c "delete from users where email like 'ui-%@shineue.edu.mn'" && docker exec coding-db psql -U coding -d coding -Atc "select count(*) from users"
```

Хүлээгдэх үр дүн: `0`. Scratchpad дахь туршилтын нууц үгийн файлыг устгана.

- [ ] **Step 6: Эцсийн checkpoint**

Run: `git status --short`
**Commit хийхгүй.** Жинхэнэ супер админыг хэрэглэгч өөрөө `npm run script -- scripts/create-admin.ts`-ээр үүсгэнэ (түр нууц үг зөвхөн тэдний терминалд харагдана).
