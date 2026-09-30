# Firestore → PostgreSQL шилжүүлэлт: хэрэгжүүлэх төлөвлөгөө

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firestore-ийг орон нутгийн PostgreSQL (Drizzle ORM)-ээр сольж, Postgres болон Piston-ийг
энэ компьютер дээр docker-compose-оор ажиллуулна. Аппын ажиллагаа өөрчлөгдөхгүй.

**Architecture:** `src/lib/firebase/*` модулиуд `src/lib/db/*`-ээр солигдоно. Функцүүдийн нэр,
параметр, буцаах төрөл нь яг хэвээрээ байх тул хуудсуудад зөвхөн import зам л өөрчлөгдөнө.
Хүснэгтийн мөрүүдийг domain төрөл рүү хөрвүүлэх ажлыг db модуль бүр өөрөө хийнэ. Transaction-ууд
`SELECT … FOR UPDATE` болон `ON CONFLICT`-оор хэрэгжинэ. Integration тестүүд тусдаа `coding_test`
өгөгдлийн сан дээр `node:test`-ээр ажиллана.

**Tech Stack:** Next.js 16.2.10, Node 24, PostgreSQL 17, drizzle-orm ^0.45.3, drizzle-kit ^0.31.11,
postgres (postgres-js) ^3.4.9, tsx ^4.23.15, Docker Desktop (WSL2), Piston.

**Spec:** `docs/superpowers/specs/2026-09-29-postgres-migration-design.md`

## Global Constraints

- **Commit ба push ХИЙХГҮЙ.** Хэрэглэгч "final code" гэж хэлэхэд л commit/push хийнэ. Task бүр
  commit-ын оронд "Checkpoint" алхмаар төгсөнө: тест ажиллуулж, `git status --short` харна.
- `shineue-db` контейнер болон 5432 портод хүрэхгүй. Энэ апп `127.0.0.1:5433` (db) болон
  `127.0.0.1:2000` (piston) портуудыг ашиглана.
- Хувилбарууд: `drizzle-orm@^0.45.3`, `postgres@^3.4.9`, `drizzle-kit@^0.31.11`, `tsx@^4.23.15`.
  Drizzle 1.0 beta/rc хувилбарыг **ашиглахгүй**.
- `src/lib/db/*.ts` файл бүр `import "server-only";`-ээр эхэлнэ. Ганц үл хамаарах нь `schema.ts`,
  учир нь drizzle-kit түүнийг react-server condition-гүйгээр ачаалдаг.
- Хуудсуудын ашигладаг бүх функцийн нэр, signature нь `src/lib/firebase/*`-тэй **яг ижил** байна.
  db давхаргад шинээр нэмэгдэх функцүүд: `updateUserRole`, `deleteUserCascade`, `unlockModule`
  (`users.ts`), `isForeignKeyViolation` (`client.ts`), `newId` (`ids.ts`).
- Хэрэглэгчид харагдах алдааны мессежүүд монголоор бичигдэнэ.
- Нууц үг, түлхүүрийг терминал эсвэл чат руу хэвлэхгүй.
- npm скриптүүд Windows дээр `cmd.exe`-ээр ажилладаг тул `VAR=x cmd` хэлбэр болон нэг хашилт
  (`'...'`) хэрэглэхгүй. Env-ийг `tsx --env-file=.env.local`-ээр уншуулна (CRLF-ийг зөв уншдаг).
- Next-тэй холбоотой код бичихээс өмнө `node_modules/next/dist/docs/`-оос холбогдох хэсгийг уншина
  (`AGENTS.md`).
- Bash командууд Git Bash дээр repo-гийн үндсэн хавтаснаас ажиллана:
  `D:\2026-2027 lessons\shine ue coding`.

### Spec-ээс зөрсөн, зориуд хийсэн өөрчлөлтүүд

1. **`setUserRole` → `updateUserRole`.** db функцийн нэрийг өөрчилсөн, учир нь `teacher-actions.ts`
   дотор ижил нэртэй server action бий.
2. **`applySubmissionScore`-ийн оролдлогын түүх transaction дотор бичигдэнэ.** Оролцогчийн мөрийг
   түгжсэний дараа бичнэ. `contest_submissions` нь оролцогч руу FK-тэй тул бүртгэлгүй оролцогч
   гадуур бичигдвэл FK алдаа гарна. Ийм дараалалтай бол "Оролцогч бүртгэлгүй байна." гэсэн
   монгол мессеж хадгалагдана.
3. **`upsertChallenge` ойлгомжтой алдаа өгнө.** Модуль олдохгүй бол FK алдааны оронд
   "Модуль олдсонгүй: <id>" гэж шиднэ.
4. **`make-test-session --teacher` өгөгдлийн сан дахь role-ийг ч солино.** Staff эрхийн шалгалт
   JWT-ийг биш, DB-ийн role-ийг уншдаг тул хоёуланг нь ижил болгоно.
5. **Өмнөөс байсан 4 lint алдааг засна.** Spec-ийн "lint алдаагүй" шалгуурыг хангахын тулд
   хоёр хуудасны escape хийгээгүй `"` тэмдэгтийг засна.

## Review Focus

1. **Seed-ийг дахин ажиллуулах эсвэл даалгаврыг дахин хадгалах.** Өмнөх утгуудтай нийлүүлж (merge)
   биш, бүхэлд нь солих ёстой. Жишээ нь hint-ийг хассан бол `hint` ба `has_hint` алга болно.
   Шалгах тест: Task 4, "upsertChallenge replaces…".
2. **Багш даалгавар хадгалах зуур модуль нь устгагдсан байх.** Түүхий SQL алдаа биш,
   "Модуль олдсонгүй" гэсэн монгол мессеж гарах ёстой. Шалгах тест: Task 4.
3. **Тест хөгжүүлэлтийн өгөгдлийн санг устгаж болохгүй.** `resetDb` бүх хүснэгтийг TRUNCATE
   хийдэг тул зөвхөн `*_test` сан дээр ажиллана. Шалгах тест: Task 2, `assertTestDatabaseUrl`.
4. **Бүртгэлгүй оролцогч тэмцээнд бодолт илгээх.** FK нэмэгдсэн ч "Оролцогч бүртгэлгүй байна."
   гэсэн мессеж гарч, оролдлогын түүхэнд мөр нэмэгдэхгүй байх ёстой. Шалгах тест: Task 6.
5. **Модуль устгахад сурагчийн XP.** Даалгавар, бодолтууд устах ч аль хэдийн авсан `total_xp`
   хасагдах ёсгүй. Шалгах тест: Task 3.

## Файлын бүтэц

| Файл | Үүрэг |
|---|---|
| `docker-compose.yml` | `db` (postgres:17) + `piston` service-үүд |
| `docker/db-init/01-create-test-db.sql` | Анх асахад `coding_test` санг үүсгэнэ |
| `drizzle.config.ts` | drizzle-kit тохиргоо (schema → `drizzle/`) |
| `drizzle/` | Үүсгэсэн SQL migration-ууд (git-д орно) |
| `scripts/migrate.ts` | Migration-ыг `DATABASE_URL` (эсвэл `--test` үед `TEST_DATABASE_URL`) руу хэрэглэнэ |
| `scripts/piston-setup.ts` | Python суулгаж, smoke test хийнэ |
| `src/lib/db/schema.ts` | Drizzle хүснэгтүүд |
| `src/lib/db/client.ts` | `getDb`, `closeDb`, `isForeignKeyViolation` |
| `src/lib/db/ids.ts` | `newId()`: 20 тэмдэгттэй [A-Za-z0-9] |
| `src/lib/db/test-helpers.ts` | Тестийн DB guard, `resetDb`, fixture-үүд |
| `src/lib/db/{users,modules,challenges,submissions,certificates,news,teacher,contests}.ts` | Firestore модулиудын оронд |
| `src/lib/db/*.test.ts` | Integration тестүүд |

---

### Task 1: Локал орчин (Postgres + Piston)

**Files:**
- Create: `docker-compose.yml`, `docker/db-init/01-create-test-db.sql`, `scripts/piston-setup.ts`
- Modify: `package.json` (dependencies, scripts), `.env.example`, `.env.local` (git-ignored)

**Interfaces:**
- Produces: `npm run db:up`, `npm run piston:setup`, `npm run script -- <file> [args]`
  (`tsx --env-file=.env.local --conditions=react-server`). Env хувьсагчид: `POSTGRES_PASSWORD`,
  `DATABASE_URL`, `TEST_DATABASE_URL`.

- [ ] **Step 1: Dependency суулгах**

```bash
npm install drizzle-orm@^0.45.3 postgres@^3.4.9
npm install -D drizzle-kit@^0.31.11 tsx@^4.23.15
```

Хүлээгдэх үр дүн: exit 0. `esbuild`-ийн install-script-ийн талаар анхааруулга гарч болох ч
tsx болон drizzle-kit түүнгүйгээр ажилладаг нь урьдчилан шалгагдсан.

- [ ] **Step 2: `docker-compose.yml` үүсгэх**

```yaml
# Local services for the platform: PostgreSQL + Piston (Python sandbox).
# Ports bind to 127.0.0.1 only — nothing here is reachable from the LAN.
# Start with `npm run db:up` (reads POSTGRES_PASSWORD from .env.local).
name: shineue-coding

services:
  db:
    image: postgres:17
    container_name: coding-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: coding
      POSTGRES_USER: coding
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env.local}
    ports:
      - "127.0.0.1:5433:5432"
    volumes:
      - coding-pgdata:/var/lib/postgresql/data
      - ./docker/db-init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U coding -d coding"]
      interval: 5s
      timeout: 3s
      retries: 20

  piston:
    image: ghcr.io/engineer-man/piston:latest
    container_name: coding-piston
    restart: unless-stopped
    privileged: true
    ports:
      - "127.0.0.1:2000:2000"
    volumes:
      - coding-piston:/piston

volumes:
  coding-pgdata:
  coding-piston:
```

- [ ] **Step 3: `docker/db-init/01-create-test-db.sql` үүсгэх**

```sql
-- Runs once, when the coding-pgdata volume is first initialised.
-- Integration tests (npm test) use this database; it is truncated freely.
CREATE DATABASE coding_test;
```

- [ ] **Step 4: `.env.local`-ийг шинэчлэх (нууц үг хэвлэхгүй)**

```bash
node -e '
const fs = require("fs");
const pw = require("crypto").randomBytes(24).toString("hex");
let env = fs.readFileSync(".env.local", "utf8").replace(/\r\n/g, "\n");
env = env.split("\n").filter((l) => !/^FIREBASE_/.test(l) && !/^# Firebase Admin SDK/.test(l)).join("\n");
if (!/^POSTGRES_PASSWORD=/m.test(env)) {
  env = env.trimEnd() + "\n\n# Local PostgreSQL (docker-compose.yml)\n" +
    `POSTGRES_PASSWORD="${pw}"\n` +
    `DATABASE_URL="postgres://coding:${pw}@127.0.0.1:5433/coding"\n` +
    `TEST_DATABASE_URL="postgres://coding:${pw}@127.0.0.1:5433/coding_test"\n`;
}
fs.writeFileSync(".env.local", env);
' && grep -o "^[A-Z_]*=" .env.local
```

Хүлээгдэх үр дүн: `AUTH_SECRET=`, `AUTH_GOOGLE_ID=`, `AUTH_GOOGLE_SECRET=`, `PISTON_URL=`,
`POSTGRES_PASSWORD=`, `DATABASE_URL=`, `TEST_DATABASE_URL=` гэсэн мөрүүд гарна. `FIREBASE_*` гарахгүй.

- [ ] **Step 5: `.env.example`-ийг бүхэлд нь солих**

```
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""

# Local PostgreSQL (docker-compose.yml). Pick a password and use it in both URLs.
POSTGRES_PASSWORD=""
DATABASE_URL="postgres://coding:<POSTGRES_PASSWORD>@127.0.0.1:5433/coding"
TEST_DATABASE_URL="postgres://coding:<POSTGRES_PASSWORD>@127.0.0.1:5433/coding_test"

PISTON_URL="http://localhost:2000/api/v2"
```

- [ ] **Step 6: `scripts/piston-setup.ts` үүсгэх**

```ts
/**
 * One-time: installs the Python runtime into the local Piston container,
 * then runs a smoke test. Safe to re-run.
 * Run: npm run piston:setup
 */
const PISTON_URL = process.env.PISTON_URL ?? "http://localhost:2000/api/v2";
const PYTHON_VERSION = "3.12.0";

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${PISTON_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function main() {
  const runtimes: { language: string; version: string }[] = await (
    await fetch(`${PISTON_URL}/runtimes`)
  ).json();

  if (!runtimes.some((r) => r.language === "python")) {
    console.log(`installing python ${PYTHON_VERSION} (takes a minute)…`);
    const res = await post("/packages", { language: "python", version: PYTHON_VERSION });
    if (!res.ok) throw new Error(`install failed: ${res.status} ${await res.text()}`);
  }

  const res = await post("/execute", {
    language: "python",
    version: PYTHON_VERSION,
    files: [{ content: "print(int(input()) * 2)" }],
    stdin: "21",
  });
  const result = await res.json();
  if (result.run?.stdout?.trim() !== "42") {
    throw new Error(`smoke test failed: ${JSON.stringify(result)}`);
  }
  console.log(`piston OK — python ${PYTHON_VERSION} runs code`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 7: `package.json`-ийн `scripts` хэсэгт нэмэх**

`"lint": "eslint"` мөрийн дараа нэмнэ:

```json
    "lint": "eslint",
    "script": "tsx --env-file=.env.local --conditions=react-server",
    "db:up": "docker compose --env-file .env.local up -d --wait",
    "piston:setup": "tsx --env-file=.env.local scripts/piston-setup.ts"
```

- [ ] **Step 8: Контейнеруудыг асааж, хоёр өгөгдлийн сан үүссэнийг шалгах**

```bash
npm run db:up && docker compose ps --format "{{.Name}} {{.Status}}" && docker exec coding-db psql -U coding -d coding -Atc "select datname from pg_database where datname like 'coding%' order by 1"
```

Хүлээгдэх үр дүн: `coding-db Up … (healthy)`, `coding-piston Up …`, дараа нь `coding` ба `coding_test`.

- [ ] **Step 9: Piston-ийг шалгах (эрсдэлтэй алхам)**

```bash
npm run piston:setup
```

Хүлээгдэх үр дүн: `piston OK — python 3.12.0 runs code`.
**Хэрэв амжилтгүй бол** (жишээ нь cgroup v2, isolate-ийн алдаа): `docker logs coding-piston --tail 50`
ажиллуулаад **зогсоно**. Log-ийг хэрэглэгчид харуулж, яаж үргэлжлүүлэхийг асууна. Өөрөө
тойрох арга хайхгүй.

- [ ] **Step 10: Checkpoint**

```bash
git status --short
```

Хүлээгдэх үр дүн: `M .env.example`, `M package.json`, `M package-lock.json`, `?? docker-compose.yml`,
`?? docker/`, `?? scripts/piston-setup.ts` (мөн `docs/` хавтас). `.env.local` жагсаалтад гарахгүй.

---

### Task 2: Schema, client, migration, тестийн орчин

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `src/lib/db/ids.ts`,
  `src/lib/db/test-helpers.ts`, `src/lib/db/harness.test.ts`, `drizzle.config.ts`,
  `scripts/migrate.ts`, `drizzle/0000_*.sql` (үүсгэгдэнэ)
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `DATABASE_URL`, `TEST_DATABASE_URL`, `npm run db:up` (Task 1)
- Produces:
  - `getDb(): PostgresJsDatabase<typeof schema>`, `closeDb(): Promise<void>`,
    `isForeignKeyViolation(err: unknown): boolean` (`@/lib/db/client`)
  - `newId(length?: number): string` (`@/lib/db/ids`)
  - Хүснэгтүүд (`@/lib/db/schema`): `users`, `modules`, `challenges`, `challengeAnswers`,
    `submissions`, `certificates`, `news`, `contests`, `contestProblems`,
    `contestProblemAnswers`, `contestParticipants`, `contestSubmissions`.
    Баганын TS түлхүүрүүд SQL нэртэйгээ ижил snake_case байна (`total_xp`, `module_id`…).
  - Test helper-ууд (`@/lib/db/test-helpers`): `assertTestDatabaseUrl(url)`, `resetDb()`,
    `addUser(uid, fields?)`, `addModule(id, order)`, `addChallenge(id, moduleId, fields?)`
  - npm скриптүүд: `db:generate`, `db:migrate`, `test`

- [ ] **Step 1: Бүтэлгүйтэх тест бичих: `src/lib/db/harness.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import {
  addChallenge,
  addModule,
  addUser,
  assertTestDatabaseUrl,
  resetDb,
} from "@/lib/db/test-helpers";
import { closeDb, getDb, isForeignKeyViolation } from "@/lib/db/client";
import { challengeAnswers, challenges, modules, submissions } from "@/lib/db/schema";
import { newId } from "@/lib/db/ids";

beforeEach(resetDb);
after(closeDb);

test("assertTestDatabaseUrl only accepts *_test databases", () => {
  assert.throws(() => assertTestDatabaseUrl(undefined));
  assert.throws(() => assertTestDatabaseUrl("postgres://u:p@127.0.0.1:5433/coding"));
  assert.equal(
    assertTestDatabaseUrl("postgres://u:p@127.0.0.1:5433/coding_test"),
    "postgres://u:p@127.0.0.1:5433/coding_test"
  );
});

test("newId returns distinct 20-character alphanumeric ids", () => {
  const a = newId();
  assert.match(a, /^[A-Za-z0-9]{20}$/);
  assert.notEqual(a, newId());
});

test("deleting a module cascades to challenges, answers and submissions", async () => {
  const db = getDb();
  await addModule("module-01", 1);
  await addUser("u1");
  await addChallenge("ch-1", "module-01");
  await db.insert(challengeAnswers).values({ challenge_id: "ch-1", hint: "h" });
  await db.insert(submissions).values({ uid: "u1", challenge_id: "ch-1", passed: true });

  await db.delete(modules).where(eq(modules.id, "module-01"));

  assert.equal((await db.select().from(challenges)).length, 0);
  assert.equal((await db.select().from(challengeAnswers)).length, 0);
  assert.equal((await db.select().from(submissions)).length, 0);
});

test("isForeignKeyViolation recognises FK errors only", async () => {
  const err = await addChallenge("ch-x", "no-such-module").catch((e: unknown) => e);
  assert.equal(isForeignKeyViolation(err), true);
  assert.equal(isForeignKeyViolation(new Error("boom")), false);
});
```

- [ ] **Step 2: `package.json`-д `test` болон migration скриптүүдийг нэмэх**

`"piston:setup"` мөрийн дараа нэмнэ:

```json
    "piston:setup": "tsx --env-file=.env.local scripts/piston-setup.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx --env-file=.env.local scripts/migrate.ts",
    "test": "tsx --env-file=.env.local scripts/migrate.ts --test && tsx --env-file=.env.local --conditions=react-server --test --test-concurrency=1 src/lib/db/*.test.ts"
```

- [ ] **Step 3: Тест ажиллуулж бүтэлгүйтэхийг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: FAIL. `scripts/migrate.ts` болон `@/lib/db/*` модулиуд байхгүй тул
"Cannot find module" алдаа гарна.

- [ ] **Step 4: `src/lib/db/schema.ts` бичих**

```ts
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
// Type-only imports (erased at runtime) — drizzle-kit loads this file
// outside Next, so it must not pull in "server-only" or path aliases.
import type { ChallengeType, PublicTestCase, UserRole } from "../types";

/*
 * TS keys mirror the SQL column names (snake_case) so rows line up with
 * the domain types in src/lib/types.ts.
 */

const tz = { withTimezone: true } as const;

export const users = pgTable(
  "users",
  {
    /** Google providerAccountId (stable across sign-ins). */
    uid: text("uid").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    photo_url: text("photo_url"),
    role: text("role").$type<UserRole>().notNull().default("student"),
    total_xp: integer("total_xp").notNull().default(0),
    unlocked_modules: text("unlocked_modules").array().notNull().default(sql`'{}'::text[]`),
    created_at: timestamp("created_at", tz).notNull().defaultNow(),
    last_login_at: timestamp("last_login_at", tz).notNull().defaultNow(),
  },
  (t) => [check("users_role_check", sql`${t.role} in ('student', 'teacher', 'admin')`)]
);

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  syllabus_ref: text("syllabus_ref").notNull().default(""),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  description: text("description").notNull().default(""),
  lesson_mdx: text("lesson_mdx").notNull().default(""),
});

export const challenges = pgTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    module_id: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    type: text("type").$type<ChallengeType>().notNull(),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    xp_reward: integer("xp_reward").notNull(),
    order: integer("order").notNull(),
    language: text("language").$type<"python">(),
    starter_code: text("starter_code"),
    public_test_cases: jsonb("public_test_cases").$type<PublicTestCase[]>(),
    options: jsonb("options").$type<string[]>(),
    has_hint: boolean("has_hint"),
  },
  (t) => [
    index("challenges_module_id_idx").on(t.module_id),
    check("challenges_type_check", sql`${t.type} in ('mcq', 'tracing', 'coding', 'theory')`),
  ]
);

/** Secret half of a challenge — never serialized to the client. */
export const challengeAnswers = pgTable("challenge_answers", {
  challenge_id: text("challenge_id")
    .primaryKey()
    .references(() => challenges.id, { onDelete: "cascade" }),
  hidden_test_cases: jsonb("hidden_test_cases").$type<PublicTestCase[]>(),
  hint: text("hint"),
  correct_answer_index: integer("correct_answer_index"),
  expected_answer: text("expected_answer"),
  mark_scheme: text("mark_scheme"),
});

export const submissions = pgTable(
  "submissions",
  {
    uid: text("uid")
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" }),
    challenge_id: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    passed: boolean("passed").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    code_snapshot: text("code_snapshot").notNull().default(""),
    hint_used: boolean("hint_used").notNull().default(false),
    updated_at: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.uid, t.challenge_id] })]
);

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  uid: text("uid")
    .notNull()
    .unique()
    .references(() => users.uid, { onDelete: "cascade" }),
  name: text("name").notNull(),
  syllabus: text("syllabus").notNull(),
  issued_at: timestamp("issued_at", tz).notNull().defaultNow(),
});

export const news = pgTable("news", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body_mdx: text("body_mdx").notNull(),
  image_url: text("image_url"),
  video_url: text("video_url"),
  audio_url: text("audio_url"),
  author_name: text("author_name"),
  // No FK: a post outlives its author's account.
  author_uid: text("author_uid").notNull(),
  published_at: timestamp("published_at", tz).notNull().defaultNow(),
});

export const contests = pgTable("contests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  starts_at: timestamp("starts_at", tz).notNull(),
  ends_at: timestamp("ends_at", tz).notNull(),
});

export const contestProblems = pgTable(
  "contest_problems",
  {
    contest_id: text("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    order: integer("order").notNull(),
    points: integer("points").notNull(),
    starter_code: text("starter_code"),
    public_test_cases: jsonb("public_test_cases").$type<PublicTestCase[]>().notNull().default([]),
  },
  (t) => [primaryKey({ columns: [t.contest_id, t.id] })]
);

export const contestProblemAnswers = pgTable(
  "contest_problem_answers",
  {
    contest_id: text("contest_id").notNull(),
    problem_id: text("problem_id").notNull(),
    hidden_test_cases: jsonb("hidden_test_cases").$type<PublicTestCase[]>().notNull().default([]),
  },
  (t) => [
    primaryKey({ columns: [t.contest_id, t.problem_id] }),
    foreignKey({
      columns: [t.contest_id, t.problem_id],
      foreignColumns: [contestProblems.contest_id, contestProblems.id],
    }).onDelete("cascade"),
  ]
);

export const contestParticipants = pgTable(
  "contest_participants",
  {
    contest_id: text("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    uid: text("uid")
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" }),
    name: text("name"),
    email: text("email").notNull(),
    /** problem id → best score */
    scores: jsonb("scores").$type<Record<string, number>>().notNull().default({}),
    total: integer("total").notNull().default(0),
    last_improved_at: timestamp("last_improved_at", tz),
    registered_at: timestamp("registered_at", tz).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contest_id, t.uid] })]
);

/** Append-only attempt log. */
export const contestSubmissions = pgTable(
  "contest_submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    contest_id: text("contest_id").notNull(),
    uid: text("uid").notNull(),
    problem_id: text("problem_id").notNull(),
    code: text("code").notNull(),
    score: integer("score").notNull(),
    passed_tests: integer("passed_tests").notNull(),
    total_tests: integer("total_tests").notNull(),
    submitted_at: timestamp("submitted_at", tz).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.contest_id, t.uid],
      foreignColumns: [contestParticipants.contest_id, contestParticipants.uid],
    }).onDelete("cascade"),
  ]
);
```

- [ ] **Step 5: `src/lib/db/client.ts` бичих**

```ts
import "server-only";

import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

/**
 * All database access goes through this server-side client — the browser
 * never talks to Postgres. Grading/XP writes stay server-authoritative.
 */
export type Db = PostgresJsDatabase<typeof schema>;

// Survives dev hot reloads, so each reload does not open a new pool.
const globalForDb = globalThis as unknown as {
  __codingDb?: { db: Db; client: ReturnType<typeof postgres> };
};

/** Lazy singleton so importing this module never throws at build time. */
export function getDb(): Db {
  if (!globalForDb.__codingDb) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "Database is not configured: set DATABASE_URL in .env.local (see .env.example) and run `npm run db:up`."
      );
    }
    const client = postgres(url, { max: 10, onnotice: () => {} });
    globalForDb.__codingDb = { client, db: drizzle(client, { schema }) };
  }
  return globalForDb.__codingDb.db;
}

/** Closes the pool (scripts and tests; the app keeps it open). */
export async function closeDb(): Promise<void> {
  const cached = globalForDb.__codingDb;
  globalForDb.__codingDb = undefined;
  await cached?.client.end();
}

/** Postgres SQLSTATE of a failed query — Drizzle wraps the driver error in `cause`. */
function pgErrorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.cause?.code ?? e?.code;
  return typeof code === "string" ? code : undefined;
}

export function isForeignKeyViolation(err: unknown): boolean {
  return pgErrorCode(err) === "23503";
}
```

- [ ] **Step 6: `src/lib/db/ids.ts` бичих**

```ts
import "server-only";

import { randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Random id in the same shape as Firestore auto-ids (public /verify links use it). */
export function newId(length = 20): string {
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}
```

- [ ] **Step 7: `src/lib/db/test-helpers.ts` бичих**

```ts
import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { challenges, modules, users } from "@/lib/db/schema";

/** resetDb() truncates every table — refuse anything but a *_test database. */
export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point at a *_test database (see .env.example).");
  }
  return url;
}

// The client reads DATABASE_URL lazily, on the first query — point it at
// the test database before any test runs.
process.env.DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);

export async function resetDb(): Promise<void> {
  await getDb().execute(sql`
    TRUNCATE users, modules, challenges, challenge_answers, submissions,
      certificates, news, contests, contest_problems, contest_problem_answers,
      contest_participants, contest_submissions
    RESTART IDENTITY CASCADE
  `);
}

export async function addUser(
  uid: string,
  fields: Partial<typeof users.$inferInsert> = {}
): Promise<void> {
  await getDb()
    .insert(users)
    .values({ uid, email: `${uid}@shineue.edu.mn`, name: uid, ...fields });
}

export async function addModule(id: string, order: number): Promise<void> {
  await getDb().insert(modules).values({ id, title: id, order });
}

export async function addChallenge(
  id: string,
  moduleId: string,
  fields: Partial<typeof challenges.$inferInsert> = {}
): Promise<void> {
  await getDb()
    .insert(challenges)
    .values({
      id,
      module_id: moduleId,
      type: "coding",
      title: id,
      prompt: "p",
      xp_reward: 10,
      order: 1,
      ...fields,
    });
}
```

- [ ] **Step 8: `drizzle.config.ts` болон `scripts/migrate.ts` бичих**

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns schema changes into SQL under drizzle/.
// Migrations are applied by scripts/migrate.ts, not drizzle-kit.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
```

`scripts/migrate.ts`:

```ts
/**
 * Applies the SQL migrations in drizzle/. `--test` targets TEST_DATABASE_URL.
 * Run: npm run db:migrate
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const target = process.argv.includes("--test") ? "TEST_DATABASE_URL" : "DATABASE_URL";
  const url = process.env[target];
  if (!url) throw new Error(`${target} is not set (see .env.example).`);

  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.log(`migrations applied to ${target}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 9: Migration үүсгэх**

Run: `npm run db:generate`
Хүлээгдэх үр дүн: `drizzle/0000_<name>.sql` үүснэ. Дотор нь 12 ширхэг `CREATE TABLE` байх ба
`ON DELETE cascade` FK-ууд, `users_role_check`, `challenges_type_check`,
`challenges_module_id_idx`, `DEFAULT '{}'::text[]` орсон байна. Шалгах:
`grep -c "CREATE TABLE" drizzle/0000_*.sql` → `12`.

- [ ] **Step 10: Тест давахыг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: `migrations applied to TEST_DATABASE_URL`, дараа нь `harness.test.ts`-ийн
4 тест бүгд PASS (`ℹ pass 4`, `ℹ fail 0`).

- [ ] **Step 11: Dev өгөгдлийн сан руу migration хийх**

Run: `npm run db:migrate`
Хүлээгдэх үр дүн: `migrations applied to DATABASE_URL`.

- [ ] **Step 12: Checkpoint**

Run: `npx tsc --noEmit -p . && git status --short`
Хүлээгдэх үр дүн: tsc алдаагүй. Шинэ файлууд: `drizzle.config.ts`, `drizzle/`, `scripts/migrate.ts`,
`src/lib/db/`.

---

### Task 3: `users.ts` + `modules.ts`

**Files:**
- Create: `src/lib/db/modules.ts`, `src/lib/db/users.ts`, `src/lib/db/modules.test.ts`,
  `src/lib/db/users.test.ts`

**Interfaces:**
- Consumes: `getDb`, `closeDb`, schema-ийн `users`, `modules`, `challenges`, `submissions`,
  `certificates`, `contests`, `contestParticipants`, `contestSubmissions`, test helper-ууд (Task 2)
- Produces:
  - `@/lib/db/modules`: `interface ModuleDoc { id; syllabus_ref; title; order; description; lesson_mdx }`,
    `listModules(): Promise<ModuleDoc[]>`, `getModule(id): Promise<ModuleDoc | null>`,
    `getFirstModuleId(): Promise<string | null>`, `upsertModule(module: ModuleDoc): Promise<void>`,
    `deleteModule(id): Promise<void>`
  - `@/lib/db/users`: `ensureUserProfile(params: { uid; email; name: string | null; photo_url: string | null }): Promise<UserProfile>`,
    `getUserProfile(uid): Promise<UserProfile | null>`, `updateUserRole(uid, role: UserRole): Promise<void>`,
    `deleteUserCascade(uid): Promise<void>`, `unlockModule(uid, moduleId): Promise<void>`

- [ ] **Step 1: Бүтэлгүйтэх тест бичих: `src/lib/db/modules.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { addChallenge, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { challenges, submissions, users } from "@/lib/db/schema";
import {
  deleteModule,
  getFirstModuleId,
  getModule,
  listModules,
  upsertModule,
  type ModuleDoc,
} from "@/lib/db/modules";

beforeEach(resetDb);
after(closeDb);

function mod(id: string, order: number, fields: Partial<ModuleDoc> = {}): ModuleDoc {
  return {
    id,
    syllabus_ref: "A1.1",
    title: `Title ${id}`,
    order,
    description: "desc",
    lesson_mdx: "# Lesson",
    ...fields,
  };
}

test("listModules sorts by order, then id; getFirstModuleId picks the first", async () => {
  await upsertModule(mod("module-03", 2));
  await upsertModule(mod("module-02", 2));
  await upsertModule(mod("module-01", 1));
  assert.deepEqual(
    (await listModules()).map((m) => m.id),
    ["module-01", "module-02", "module-03"]
  );
  assert.equal(await getFirstModuleId(), "module-01");
});

test("getFirstModuleId is null without modules", async () => {
  assert.equal(await getFirstModuleId(), null);
});

test("getModule returns the full module and rejects malformed ids", async () => {
  await upsertModule(mod("module-01", 1));
  assert.deepEqual(await getModule("module-01"), mod("module-01", 1));
  assert.equal(await getModule("missing"), null);
  assert.equal(await getModule("../etc"), null);
});

test("upsertModule overwrites an existing module", async () => {
  await upsertModule(mod("module-01", 1));
  await upsertModule(mod("module-01", 5, { title: "Шинэ", lesson_mdx: "new" }));
  assert.deepEqual(await getModule("module-01"), mod("module-01", 5, { title: "Шинэ", lesson_mdx: "new" }));
});

test("deleteModule removes its challenges and submissions but keeps earned XP", async () => {
  const db = getDb();
  await upsertModule(mod("module-01", 1));
  await addUser("u1", { total_xp: 40 });
  await addChallenge("ch-1", "module-01");
  await db.insert(submissions).values({ uid: "u1", challenge_id: "ch-1", passed: true });

  await deleteModule("module-01");

  assert.equal(await getModule("module-01"), null);
  assert.equal((await db.select().from(challenges)).length, 0);
  assert.equal((await db.select().from(submissions)).length, 0);
  const [u] = await db.select().from(users).where(eq(users.uid, "u1"));
  assert.equal(u.total_xp, 40);
});
```

- [ ] **Step 2: Бүтэлгүйтэх тест бичих: `src/lib/db/users.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import {
  certificates,
  contestParticipants,
  contests,
  contestSubmissions,
  submissions,
} from "@/lib/db/schema";
import {
  deleteUserCascade,
  ensureUserProfile,
  getUserProfile,
  unlockModule,
  updateUserRole,
} from "@/lib/db/users";
import { FIRST_MODULE_ID, SUPER_ADMIN_EMAIL } from "@/lib/constants";

beforeEach(resetDb);
after(closeDb);

const student = { uid: "u1", email: "u1@shineue.edu.mn", name: "Бат", photo_url: null };

test("first sign-in creates a student with 0 XP and the first module unlocked", async () => {
  await addModule("module-02", 2);
  await addModule("module-01", 1);
  assert.deepEqual(await ensureUserProfile(student), {
    ...student,
    role: "student",
    total_xp: 0,
    unlocked_modules: ["module-01"],
  });
});

test("first sign-in falls back to FIRST_MODULE_ID when no modules exist", async () => {
  const p = await ensureUserProfile(student);
  assert.deepEqual(p.unlocked_modules, [FIRST_MODULE_ID]);
});

test("later sign-ins refresh name/photo but never progress or role", async () => {
  await addUser("u1", {
    name: "Хуучин",
    total_xp: 120,
    unlocked_modules: ["module-01", "module-02"],
    role: "teacher",
  });
  const p = await ensureUserProfile({ ...student, name: "Шинэ", photo_url: "https://x/y.png" });
  assert.deepEqual(p, {
    uid: "u1",
    email: "u1@shineue.edu.mn",
    name: "Шинэ",
    photo_url: "https://x/y.png",
    role: "teacher",
    total_xp: 120,
    unlocked_modules: ["module-01", "module-02"],
  });
});

test("the super admin is admin on first sign-in and self-heals later", async () => {
  const admin = { uid: "adm", email: SUPER_ADMIN_EMAIL, name: "Админ", photo_url: null };
  assert.equal((await ensureUserProfile(admin)).role, "admin");
  await updateUserRole("adm", "student");
  assert.equal((await ensureUserProfile(admin)).role, "admin");
});

test("getUserProfile returns null for unknown users", async () => {
  assert.equal(await getUserProfile("nobody"), null);
});

test("updateUserRole changes the role", async () => {
  await addUser("u1");
  await updateUserRole("u1", "teacher");
  assert.equal((await getUserProfile("u1"))?.role, "teacher");
});

test("unlockModule appends once", async () => {
  await addUser("u1", { unlocked_modules: ["module-01"] });
  await unlockModule("u1", "module-02");
  await unlockModule("u1", "module-02");
  assert.deepEqual((await getUserProfile("u1"))?.unlocked_modules, ["module-01", "module-02"]);
});

test("deleteUserCascade removes the user and all their data", async () => {
  const db = getDb();
  await addModule("module-01", 1);
  await addChallenge("ch-1", "module-01");
  await addUser("u1");
  await addUser("u2");
  await db.insert(submissions).values({ uid: "u1", challenge_id: "ch-1", passed: true });
  await db.insert(certificates).values({ id: "cert1", uid: "u1", name: "Бат", syllabus: "s" });
  await db.insert(contests).values({
    id: "cup",
    title: "Cup",
    starts_at: new Date("2026-01-01T00:00:00Z"),
    ends_at: new Date("2026-01-02T00:00:00Z"),
  });
  await db.insert(contestParticipants).values({ contest_id: "cup", uid: "u1", email: "u1@x" });
  await db.insert(contestSubmissions).values({
    contest_id: "cup",
    uid: "u1",
    problem_id: "p1",
    code: "",
    score: 0,
    passed_tests: 0,
    total_tests: 1,
  });

  await deleteUserCascade("u1");

  assert.equal(await getUserProfile("u1"), null);
  assert.ok(await getUserProfile("u2"));
  assert.equal((await db.select().from(submissions)).length, 0);
  assert.equal((await db.select().from(certificates)).length, 0);
  assert.equal((await db.select().from(contestParticipants)).length, 0);
  assert.equal((await db.select().from(contestSubmissions)).length, 0);
});
```

- [ ] **Step 3: Тест бүтэлгүйтэхийг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: FAIL. `modules.test.ts` болон `users.test.ts` дээр
"Cannot find module '@/lib/db/modules'" гэсэн алдаа гарна.

- [ ] **Step 4: `src/lib/db/modules.ts` бичих**

```ts
import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { modules } from "@/lib/db/schema";

export interface ModuleDoc {
  id: string;
  syllabus_ref: string;
  title: string;
  order: number;
  description: string;
  /** Lesson body (MDX). */
  lesson_mdx: string;
}

/** All modules sorted by order — the sequence students follow. */
export async function listModules(): Promise<ModuleDoc[]> {
  return getDb().select().from(modules).orderBy(asc(modules.order), asc(modules.id));
}

export async function getModule(id: string): Promise<ModuleDoc | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const [row] = await getDb().select().from(modules).where(eq(modules.id, id)).limit(1);
  return row ?? null;
}

/** The entry module new students start with (lowest order). */
export async function getFirstModuleId(): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: modules.id })
    .from(modules)
    .orderBy(asc(modules.order), asc(modules.id))
    .limit(1);
  return row?.id ?? null;
}

export async function upsertModule(module: ModuleDoc): Promise<void> {
  const { id, ...data } = module;
  await getDb()
    .insert(modules)
    .values({ id, ...data })
    .onConflictDoUpdate({ target: modules.id, set: data });
}

/** Also deletes the module's challenges and their submissions (FK cascade). */
export async function deleteModule(id: string): Promise<void> {
  await getDb().delete(modules).where(eq(modules.id, id));
}
```

- [ ] **Step 5: `src/lib/db/users.ts` бичих**

```ts
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getFirstModuleId } from "@/lib/db/modules";
import { FIRST_MODULE_ID, SUPER_ADMIN_EMAIL } from "@/lib/constants";
import type { UserProfile, UserRole } from "@/lib/types";

function toProfile(r: typeof users.$inferSelect): UserProfile {
  return {
    uid: r.uid,
    email: r.email,
    name: r.name,
    photo_url: r.photo_url,
    role: r.role,
    total_xp: r.total_xp,
    unlocked_modules: r.unlocked_modules,
  };
}

/**
 * Creates the user row on first sign-in: 0 XP, student role, only the
 * entry module unlocked. On later sign-ins it only refreshes the mutable
 * Google profile fields — progress columns are never touched.
 */
export async function ensureUserProfile(params: {
  uid: string;
  email: string;
  name: string | null;
  photo_url: string | null;
}): Promise<UserProfile> {
  // The entry module is whichever the teacher ordered first.
  const firstModule = (await getFirstModuleId().catch(() => null)) ?? FIRST_MODULE_ID;

  const isSuperAdmin = params.email === SUPER_ADMIN_EMAIL;

  // A single upsert, so two concurrent first sign-ins cannot both run
  // the "new user" path.
  const [row] = await getDb()
    .insert(users)
    .values({
      uid: params.uid,
      email: params.email,
      name: params.name,
      photo_url: params.photo_url,
      // Everyone starts as a student; teachers are appointed by the admin.
      role: isSuperAdmin ? "admin" : "student",
      unlocked_modules: [firstModule],
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        name: params.name,
        photo_url: params.photo_url,
        last_login_at: sql`now()`,
        // Self-heals the admin account even if the row predates the role.
        ...(isSuperAdmin ? { role: "admin" as const } : {}),
      },
    })
    .returning();
  return toProfile(row);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const [row] = await getDb().select().from(users).where(eq(users.uid, uid)).limit(1);
  return row ? toProfile(row) : null;
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await getDb().update(users).set({ role }).where(eq(users.uid, uid));
}

/**
 * Erases the user and — via ON DELETE CASCADE — their submissions,
 * certificates and contest entries.
 */
export async function deleteUserCascade(uid: string): Promise<void> {
  await getDb().delete(users).where(eq(users.uid, uid));
}

/** Adds a module to the user's unlocked list; a no-op if already there. */
export async function unlockModule(uid: string, moduleId: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ unlocked_modules: sql`array_append(${users.unlocked_modules}, ${moduleId})` })
    .where(and(eq(users.uid, uid), sql`NOT (${moduleId} = ANY(${users.unlocked_modules}))`));
}
```

- [ ] **Step 6: Тест давахыг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: PASS, 4 (harness) + 5 (modules) + 8 (users) = 17 тест, `ℹ fail 0`.

- [ ] **Step 7: Checkpoint**

Run: `npx tsc --noEmit -p . && git status --short src/lib/db`
Хүлээгдэх үр дүн: tsc алдаагүй. 4 шинэ файл нэмэгдсэн.

---

### Task 4: `challenges.ts` + `submissions.ts`

**Files:**
- Create: `src/lib/db/challenges.ts`, `src/lib/db/submissions.ts`,
  `src/lib/db/challenges.test.ts`, `src/lib/db/submissions.test.ts`

**Interfaces:**
- Consumes: `getDb`, `isForeignKeyViolation` (Task 2); `upsertModule` (Task 3); `Challenge`,
  `ChallengePrivate`, `Submission`, `HINT_XP_FACTOR` (`@/lib/types`)
- Produces:
  - `@/lib/db/challenges`: `getChallenge(id): Promise<Challenge | null>`,
    `getChallengePrivate(id): Promise<ChallengePrivate | null>`,
    `listChallengesByModule(moduleId): Promise<Challenge[]>`,
    `upsertChallenge(challenge: Challenge, privateData: ChallengePrivate): Promise<void>`,
    `deleteChallenge(id): Promise<void>`
  - `@/lib/db/submissions`: `getSubmission(uid, challengeId): Promise<Submission | null>`,
    `listPassedChallengeIds(uid): Promise<Set<string>>`, `markHintUsed(uid, challengeId): Promise<void>`,
    `recordSubmission(params: { uid; challengeId; code; passed: boolean; xpReward: number }): Promise<{ xpAwarded: number }>`

- [ ] **Step 1: Бүтэлгүйтэх тест бичих: `src/lib/db/challenges.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { challengeAnswers, submissions } from "@/lib/db/schema";
import {
  deleteChallenge,
  getChallenge,
  getChallengePrivate,
  listChallengesByModule,
  upsertChallenge,
} from "@/lib/db/challenges";
import type { Challenge, ChallengePrivate } from "@/lib/types";

beforeEach(async () => {
  await resetDb();
  await addModule("module-01", 1);
});
after(closeDb);

const coding: Challenge = {
  id: "ch-sum",
  module_id: "module-01",
  type: "coding",
  title: "Нийлбэр",
  prompt: "a + b",
  xp_reward: 10,
  order: 1,
  language: "python",
  starter_code: "a = int(input())",
  public_test_cases: [{ input: "1\n2", expected_output: "3" }],
  has_hint: true,
};
const codingPrivate: ChallengePrivate = {
  hidden_test_cases: [{ input: "5\n5", expected_output: "10" }],
  hint: "print(a + b)",
};

test("getChallenge returns only the public half", async () => {
  await upsertChallenge(coding, codingPrivate);
  const got = await getChallenge("ch-sum");
  assert.deepEqual(got, { ...coding, options: undefined });
  for (const secret of ["hidden_test_cases", "hint", "correct_answer_index", "expected_answer", "mark_scheme"]) {
    assert.equal(secret in (got as object), false, `${secret} leaked`);
  }
});

test("getChallengePrivate returns the secret half", async () => {
  await upsertChallenge(coding, codingPrivate);
  assert.deepEqual(await getChallengePrivate("ch-sum"), {
    ...codingPrivate,
    correct_answer_index: undefined,
    expected_answer: undefined,
    mark_scheme: undefined,
  });
  assert.equal(await getChallengePrivate("missing"), null);
});

test("upsertChallenge replaces the whole challenge — removed fields are cleared", async () => {
  await upsertChallenge(coding, codingPrivate);
  await upsertChallenge({ ...coding, has_hint: undefined, title: "Шинэ" }, { hidden_test_cases: [] });

  const pub = await getChallenge("ch-sum");
  assert.equal(pub?.title, "Шинэ");
  assert.equal(pub?.has_hint, undefined);
  assert.equal((await getChallengePrivate("ch-sum"))?.hint, undefined);
});

test("mcq answers keep index 0", async () => {
  await upsertChallenge(
    { ...coding, id: "ch-mcq", type: "mcq", options: ["a", "b"], public_test_cases: undefined },
    { correct_answer_index: 0 }
  );
  assert.equal((await getChallengePrivate("ch-mcq"))?.correct_answer_index, 0);
  assert.deepEqual((await getChallenge("ch-mcq"))?.options, ["a", "b"]);
});

test("upsertChallenge for a missing module fails with a readable message", async () => {
  await assert.rejects(
    upsertChallenge({ ...coding, module_id: "module-99" }, {}),
    /Модуль олдсонгүй: module-99/
  );
});

test("listChallengesByModule sorts by order", async () => {
  await addModule("module-02", 2);
  await upsertChallenge({ ...coding, id: "ch-b", order: 2 }, {});
  await upsertChallenge({ ...coding, id: "ch-a", order: 1 }, {});
  await upsertChallenge({ ...coding, id: "ch-other", module_id: "module-02" }, {});
  assert.deepEqual(
    (await listChallengesByModule("module-01")).map((c) => c.id),
    ["ch-a", "ch-b"]
  );
});

test("deleteChallenge removes answers and submissions", async () => {
  await addUser("u1");
  await upsertChallenge(coding, codingPrivate);
  await getDb().insert(submissions).values({ uid: "u1", challenge_id: "ch-sum" });
  await deleteChallenge("ch-sum");
  assert.equal(await getChallenge("ch-sum"), null);
  assert.equal((await getDb().select().from(challengeAnswers)).length, 0);
  assert.equal((await getDb().select().from(submissions)).length, 0);
});
```

- [ ] **Step 2: Бүтэлгүйтэх тест бичих: `src/lib/db/submissions.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb } from "@/lib/db/client";
import { getUserProfile } from "@/lib/db/users";
import {
  getSubmission,
  listPassedChallengeIds,
  markHintUsed,
  recordSubmission,
} from "@/lib/db/submissions";

beforeEach(async () => {
  await resetDb();
  await addModule("module-01", 1);
  await addChallenge("ch-1", "module-01");
  await addChallenge("ch-2", "module-01", { order: 2 });
  await addUser("u1");
});
after(closeDb);

const attempt = (passed: boolean, code = "print(1)") =>
  recordSubmission({ uid: "u1", challengeId: "ch-1", code, passed, xpReward: 10 });

const xp = async () => (await getUserProfile("u1"))!.total_xp;

test("XP is paid only on the first successful pass", async () => {
  assert.deepEqual(await attempt(false), { xpAwarded: 0 });
  assert.deepEqual(await attempt(true), { xpAwarded: 10 });
  assert.deepEqual(await attempt(true), { xpAwarded: 0 });
  assert.equal(await xp(), 10);
});

test("a later failed run never un-passes, but records the attempt and code", async () => {
  await attempt(true, "good");
  await attempt(false, "bad");
  assert.deepEqual(await getSubmission("u1", "ch-1"), {
    challenge_id: "ch-1",
    passed: true,
    attempts: 2,
    code_snapshot: "bad",
    hint_used: false,
  });
});

test("using a hint first costs 30% of the reward", async () => {
  await markHintUsed("u1", "ch-1");
  assert.deepEqual(await attempt(true), { xpAwarded: 7 });
  assert.equal(await xp(), 7);
});

test("markHintUsed on a passed submission keeps it passed", async () => {
  await attempt(true);
  await markHintUsed("u1", "ch-1");
  const s = await getSubmission("u1", "ch-1");
  assert.equal(s?.passed, true);
  assert.equal(s?.hint_used, true);
});

test("concurrent passing submissions pay XP exactly once", async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => attempt(true)));
  assert.equal(results.filter((r) => r.xpAwarded > 0).length, 1);
  assert.equal(await xp(), 10);
  assert.equal((await getSubmission("u1", "ch-1"))?.attempts, 5);
});

test("listPassedChallengeIds lists only passed challenges", async () => {
  await attempt(true);
  await recordSubmission({ uid: "u1", challengeId: "ch-2", code: "", passed: false, xpReward: 10 });
  assert.deepEqual([...(await listPassedChallengeIds("u1"))], ["ch-1"]);
  assert.equal(await getSubmission("u1", "missing"), null);
});
```

- [ ] **Step 3: Тест бүтэлгүйтэхийг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: FAIL. "Cannot find module '@/lib/db/challenges'" болон `@/lib/db/submissions`
модуль олдохгүй гэсэн алдаа гарна.

- [ ] **Step 4: `src/lib/db/challenges.ts` бичих**

```ts
import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb, isForeignKeyViolation } from "@/lib/db/client";
import { challengeAnswers, challenges } from "@/lib/db/schema";
import type { Challenge, ChallengePrivate } from "@/lib/types";

function toChallenge(r: typeof challenges.$inferSelect): Challenge {
  return {
    id: r.id,
    module_id: r.module_id,
    type: r.type,
    title: r.title,
    prompt: r.prompt,
    xp_reward: r.xp_reward,
    order: r.order,
    language: r.language ?? undefined,
    starter_code: r.starter_code ?? undefined,
    public_test_cases: r.public_test_cases ?? undefined,
    options: r.options ?? undefined,
    has_hint: r.has_hint ?? undefined,
  };
}

function toPrivate(r: typeof challengeAnswers.$inferSelect): ChallengePrivate {
  return {
    hidden_test_cases: r.hidden_test_cases ?? undefined,
    hint: r.hint ?? undefined,
    correct_answer_index: r.correct_answer_index ?? undefined,
    expected_answer: r.expected_answer ?? undefined,
    mark_scheme: r.mark_scheme ?? undefined,
  };
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const [row] = await getDb().select().from(challenges).where(eq(challenges.id, id)).limit(1);
  return row ? toChallenge(row) : null;
}

/** Server-side only — hidden tests must never be serialized to the client. */
export async function getChallengePrivate(id: string): Promise<ChallengePrivate | null> {
  const [row] = await getDb()
    .select()
    .from(challengeAnswers)
    .where(eq(challengeAnswers.challenge_id, id))
    .limit(1);
  return row ? toPrivate(row) : null;
}

export async function listChallengesByModule(moduleId: string): Promise<Challenge[]> {
  const rows = await getDb()
    .select()
    .from(challenges)
    .where(eq(challenges.module_id, moduleId))
    .orderBy(asc(challenges.order), asc(challenges.id));
  return rows.map(toChallenge);
}

/**
 * Writes public + private parts together (teacher content editor, seeds).
 * Replaces the whole challenge: optional fields left out are cleared.
 */
export async function upsertChallenge(
  challenge: Challenge,
  privateData: ChallengePrivate
): Promise<void> {
  const { id, ...c } = challenge;
  const row = {
    module_id: c.module_id,
    type: c.type,
    title: c.title,
    prompt: c.prompt,
    xp_reward: c.xp_reward,
    order: c.order,
    language: c.language ?? null,
    starter_code: c.starter_code ?? null,
    public_test_cases: c.public_test_cases ?? null,
    options: c.options ?? null,
    has_hint: c.has_hint ?? null,
  };
  const answers = {
    hidden_test_cases: privateData.hidden_test_cases ?? null,
    hint: privateData.hint ?? null,
    correct_answer_index: privateData.correct_answer_index ?? null,
    expected_answer: privateData.expected_answer ?? null,
    mark_scheme: privateData.mark_scheme ?? null,
  };

  try {
    await getDb().transaction(async (tx) => {
      await tx
        .insert(challenges)
        .values({ id, ...row })
        .onConflictDoUpdate({ target: challenges.id, set: row });
      await tx
        .insert(challengeAnswers)
        .values({ challenge_id: id, ...answers })
        .onConflictDoUpdate({ target: challengeAnswers.challenge_id, set: answers });
    });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new Error(`Модуль олдсонгүй: ${c.module_id}`);
    throw err;
  }
}

/** Also deletes the answers and every submission of it (FK cascade). */
export async function deleteChallenge(id: string): Promise<void> {
  await getDb().delete(challenges).where(eq(challenges.id, id));
}
```

- [ ] **Step 5: `src/lib/db/submissions.ts` бичих**

```ts
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { submissions, users } from "@/lib/db/schema";
import { HINT_XP_FACTOR, type Submission } from "@/lib/types";

function toSubmission(r: typeof submissions.$inferSelect): Submission {
  return {
    challenge_id: r.challenge_id,
    passed: r.passed,
    attempts: r.attempts,
    code_snapshot: r.code_snapshot,
    hint_used: r.hint_used,
  };
}

function byKey(uid: string, challengeId: string) {
  return and(eq(submissions.uid, uid), eq(submissions.challenge_id, challengeId));
}

export async function getSubmission(
  uid: string,
  challengeId: string
): Promise<Submission | null> {
  const [row] = await getDb().select().from(submissions).where(byKey(uid, challengeId)).limit(1);
  return row ? toSubmission(row) : null;
}

export async function listPassedChallengeIds(uid: string): Promise<Set<string>> {
  const rows = await getDb()
    .select({ id: submissions.challenge_id })
    .from(submissions)
    .where(and(eq(submissions.uid, uid), eq(submissions.passed, true)));
  return new Set(rows.map((r) => r.id));
}

/**
 * Marks the hint as used BEFORE the hint text is returned to the client —
 * the penalty is recorded server-side, so the client cannot lie about it
 * at grading time.
 */
export async function markHintUsed(uid: string, challengeId: string): Promise<void> {
  await getDb()
    .insert(submissions)
    .values({ uid, challenge_id: challengeId, hint_used: true })
    .onConflictDoUpdate({
      target: [submissions.uid, submissions.challenge_id],
      set: { hint_used: true },
    });
}

/**
 * Records an attempt and awards XP atomically. XP is granted only on the
 * first successful pass — re-running a passed challenge never double-pays,
 * and a later failed run never un-passes it. A hint recorded on the
 * submission costs 30% of the reward.
 */
export async function recordSubmission(params: {
  uid: string;
  challengeId: string;
  code: string;
  passed: boolean;
  xpReward: number;
}): Promise<{ xpAwarded: number }> {
  const key = byKey(params.uid, params.challengeId);

  return getDb().transaction(async (tx) => {
    // Make sure the row exists, then lock it: concurrent submissions of the
    // same challenge queue up here and see each other's result.
    await tx
      .insert(submissions)
      .values({ uid: params.uid, challenge_id: params.challengeId })
      .onConflictDoNothing();
    const [prev] = await tx.select().from(submissions).where(key).for("update");

    const firstPass = params.passed && !prev.passed;
    const xpAwarded = firstPass
      ? prev.hint_used
        ? Math.round(params.xpReward * HINT_XP_FACTOR)
        : params.xpReward
      : 0;

    await tx
      .update(submissions)
      .set({
        passed: prev.passed || params.passed,
        attempts: prev.attempts + 1,
        code_snapshot: params.code,
        updated_at: sql`now()`,
      })
      .where(key);
    if (xpAwarded > 0) {
      await tx
        .update(users)
        .set({ total_xp: sql`${users.total_xp} + ${xpAwarded}` })
        .where(eq(users.uid, params.uid));
    }
    return { xpAwarded };
  });
}
```

- [ ] **Step 6: Тест давахыг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: PASS, нийт 17 + 7 + 6 = 30 тест, `ℹ fail 0`.

- [ ] **Step 7: Checkpoint**

Run: `npx tsc --noEmit -p . && git status --short src/lib/db`

---

### Task 5: `certificates.ts` + `news.ts` + `teacher.ts`

**Files:**
- Create: `src/lib/db/certificates.ts`, `src/lib/db/news.ts`, `src/lib/db/teacher.ts`,
  `src/lib/db/certificates.test.ts`, `src/lib/db/news.test.ts`, `src/lib/db/teacher.test.ts`

**Interfaces:**
- Consumes: `getDb` (Task 2), `newId` (Task 2), test helper-ууд
- Produces:
  - `@/lib/db/certificates`: `SYLLABUS_TITLE`, `interface Certificate { id; uid; name; syllabus; issued_at: string /* YYYY-MM-DD */ }`,
    `getOrCreateCertificate(uid, name): Promise<Certificate>`, `getCertificate(id): Promise<Certificate | null>`
  - `@/lib/db/news`: `interface NewsPost { id; title; body_mdx; image_url; video_url; audio_url; author_name; author_uid; published_at: number /* epoch ms */ }`,
    `listNews()`, `getNews(id)`, `createNews(data: Omit<NewsPost, "id" | "published_at">): Promise<string>`,
    `updateNews(id, data: Partial<Omit<NewsPost, "id" | "published_at" | "author_uid">>)`, `deleteNews(id)`
  - `@/lib/db/teacher`: `interface StudentOverview { uid; name; email; role; total_xp; unlocked_count; passed_count; total_attempts; hints_used; last_login: string | null }`,
    `listStudentOverviews(includeStaff = false): Promise<StudentOverview[]>`

- [ ] **Step 1: Бүтэлгүйтэх тест бичих: `src/lib/db/certificates.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb } from "@/lib/db/client";
import { getCertificate, getOrCreateCertificate, SYLLABUS_TITLE } from "@/lib/db/certificates";

beforeEach(async () => {
  await resetDb();
  await addUser("s1");
});
after(closeDb);

test("a student's certificate is minted once and keeps its id", async () => {
  const a = await getOrCreateCertificate("s1", "Бат");
  const b = await getOrCreateCertificate("s1", "Өөр нэр");
  assert.deepEqual(b, a);
  assert.match(a.id, /^[A-Za-z0-9]{20}$/);
  assert.equal(a.uid, "s1");
  assert.equal(a.name, "Бат");
  assert.equal(a.syllabus, SYLLABUS_TITLE);
  assert.match(a.issued_at, /^\d{4}-\d{2}-\d{2}$/);
});

test("concurrent requests still mint a single certificate", async () => {
  const [a, b] = await Promise.all([
    getOrCreateCertificate("s1", "Бат"),
    getOrCreateCertificate("s1", "Бат"),
  ]);
  assert.equal(a.id, b.id);
});

test("getCertificate finds by id and rejects unknown or malformed ids", async () => {
  const cert = await getOrCreateCertificate("s1", "Бат");
  assert.deepEqual(await getCertificate(cert.id), cert);
  assert.equal(await getCertificate("AAAAAAAAAAAAAAAAAAAA"), null);
  assert.equal(await getCertificate("bad id!"), null);
});
```

- [ ] **Step 2: Бүтэлгүйтэх тест бичих: `src/lib/db/news.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { news } from "@/lib/db/schema";
import { createNews, deleteNews, getNews, listNews, updateNews } from "@/lib/db/news";

beforeEach(resetDb);
after(closeDb);

const post = {
  title: "Мэдээ",
  body_mdx: "Агуулга энд байна",
  image_url: null,
  video_url: "https://youtu.be/x",
  audio_url: null,
  author_name: "Багш",
  author_uid: "t1",
};

test("createNews stores a post under a random id, published now", async () => {
  const id = await createNews(post);
  assert.match(id, /^[A-Za-z0-9]{20}$/);
  const got = await getNews(id);
  assert.ok(got);
  assert.deepEqual({ ...got, published_at: 0 }, { ...post, id, published_at: 0 });
  assert.ok(Math.abs(got.published_at - Date.now()) < 60_000);
});

test("listNews returns newest first", async () => {
  await getDb().insert(news).values([
    { id: "old", ...post, published_at: new Date("2026-01-01T00:00:00Z") },
    { id: "new", ...post, published_at: new Date("2026-02-01T00:00:00Z") },
  ]);
  assert.deepEqual((await listNews()).map((p) => p.id), ["new", "old"]);
});

test("updateNews changes only the given fields; deleteNews removes the post", async () => {
  const id = await createNews(post);
  await updateNews(id, { title: "Засварласан", image_url: "https://x/y.png" });
  const got = await getNews(id);
  assert.equal(got?.title, "Засварласан");
  assert.equal(got?.image_url, "https://x/y.png");
  assert.equal(got?.body_mdx, post.body_mdx);
  await deleteNews(id);
  assert.equal(await getNews(id), null);
});

test("getNews rejects malformed ids", async () => {
  assert.equal(await getNews("bad-id!"), null);
});
```

- [ ] **Step 3: Бүтэлгүйтэх тест бичих: `src/lib/db/teacher.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addChallenge, addModule, addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import { submissions } from "@/lib/db/schema";
import { listStudentOverviews } from "@/lib/db/teacher";

beforeEach(resetDb);
after(closeDb);

test("listStudentOverviews aggregates per student, highest XP first", async () => {
  await addModule("module-01", 1);
  await addChallenge("ch-1", "module-01");
  await addChallenge("ch-2", "module-01", { order: 2 });
  await addUser("s1", { total_xp: 10, unlocked_modules: ["module-01"] });
  await addUser("s2", { total_xp: 30, unlocked_modules: ["module-01", "module-02"] });
  await addUser("t1", { role: "teacher", total_xp: 99 });
  await getDb().insert(submissions).values([
    { uid: "s1", challenge_id: "ch-1", passed: true, attempts: 2, hint_used: true },
    { uid: "s1", challenge_id: "ch-2", passed: false, attempts: 3 },
  ]);

  const rows = await listStudentOverviews();
  assert.deepEqual(rows.map((r) => r.uid), ["s2", "s1"]);

  const [s2, s1] = rows;
  assert.deepEqual(
    { ...s1, last_login: null },
    {
      uid: "s1",
      name: "s1",
      email: "s1@shineue.edu.mn",
      role: "student",
      total_xp: 10,
      unlocked_count: 1,
      passed_count: 1,
      total_attempts: 5,
      hints_used: 1,
      last_login: null,
    }
  );
  assert.match(s1.last_login ?? "", /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(s2.passed_count, 0);
  assert.equal(s2.total_attempts, 0);
  assert.equal(s2.hints_used, 0);
  assert.equal(s2.unlocked_count, 2);
});

test("includeStaff also lists teachers", async () => {
  await addUser("s1");
  await addUser("t1", { role: "teacher" });
  assert.deepEqual((await listStudentOverviews()).map((r) => r.uid), ["s1"]);
  assert.deepEqual((await listStudentOverviews(true)).map((r) => r.uid).sort(), ["s1", "t1"]);
});
```

- [ ] **Step 4: Тест бүтэлгүйтэхийг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: FAIL. 3 шинэ файлд "Cannot find module" гэсэн алдаа гарна.

- [ ] **Step 5: `src/lib/db/certificates.ts` бичих**

```ts
import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { certificates } from "@/lib/db/schema";

export const SYLLABUS_TITLE = "IBDP Computer Science (2027 syllabus)";

export interface Certificate {
  id: string;
  uid: string;
  name: string;
  syllabus: string;
  /** ISO date string (issue date). */
  issued_at: string;
}

function toCertificate(r: typeof certificates.$inferSelect): Certificate {
  return {
    id: r.id,
    uid: r.uid,
    name: r.name,
    syllabus: r.syllabus,
    issued_at: r.issued_at.toISOString().slice(0, 10),
  };
}

/**
 * Mints the certificate record once per student (uid is UNIQUE). The
 * caller must have verified course completion server-side first.
 */
export async function getOrCreateCertificate(uid: string, name: string): Promise<Certificate> {
  const db = getDb();
  await db
    .insert(certificates)
    .values({ id: newId(), uid, name, syllabus: SYLLABUS_TITLE })
    .onConflictDoNothing({ target: certificates.uid });
  const [row] = await db.select().from(certificates).where(eq(certificates.uid, uid)).limit(1);
  return toCertificate(row);
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const [row] = await getDb().select().from(certificates).where(eq(certificates.id, id)).limit(1);
  return row ? toCertificate(row) : null;
}
```

- [ ] **Step 6: `src/lib/db/news.ts` бичих**

```ts
import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { news } from "@/lib/db/schema";

export interface NewsPost {
  id: string;
  title: string;
  /** Markdown body — images can also be embedded inline. */
  body_mdx: string;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  author_name: string | null;
  author_uid: string;
  /** epoch ms */
  published_at: number;
}

function toNews(r: typeof news.$inferSelect): NewsPost {
  return { ...r, published_at: r.published_at.getTime() };
}

/** Newest first. */
export async function listNews(): Promise<NewsPost[]> {
  const rows = await getDb().select().from(news).orderBy(desc(news.published_at));
  return rows.map(toNews);
}

export async function getNews(id: string): Promise<NewsPost | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const [row] = await getDb().select().from(news).where(eq(news.id, id)).limit(1);
  return row ? toNews(row) : null;
}

export async function createNews(data: Omit<NewsPost, "id" | "published_at">): Promise<string> {
  const id = newId();
  await getDb().insert(news).values({ id, ...data });
  return id;
}

export async function updateNews(
  id: string,
  data: Partial<Omit<NewsPost, "id" | "published_at" | "author_uid">>
): Promise<void> {
  await getDb().update(news).set(data).where(eq(news.id, id));
}

export async function deleteNews(id: string): Promise<void> {
  await getDb().delete(news).where(eq(news.id, id));
}
```

- [ ] **Step 7: `src/lib/db/teacher.ts` бичих**

```ts
import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { submissions, users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/types";

export interface StudentOverview {
  uid: string;
  name: string | null;
  email: string;
  role: UserRole;
  total_xp: number;
  unlocked_count: number;
  passed_count: number;
  total_attempts: number;
  hints_used: number;
  last_login: string | null;
}

/**
 * Roster with per-student submission stats in one grouped query.
 * `includeStaff` lists teachers/admin too (the admin's user management view).
 */
export async function listStudentOverviews(includeStaff = false): Promise<StudentOverview[]> {
  const rows = await getDb()
    .select({
      uid: users.uid,
      name: users.name,
      email: users.email,
      role: users.role,
      total_xp: users.total_xp,
      last_login_at: users.last_login_at,
      unlocked_count: sql<number>`cardinality(${users.unlocked_modules})`.mapWith(Number),
      passed_count: sql<number>`count(*) filter (where ${submissions.passed})`.mapWith(Number),
      total_attempts: sql<number>`coalesce(sum(${submissions.attempts}), 0)`.mapWith(Number),
      hints_used: sql<number>`count(*) filter (where ${submissions.hint_used})`.mapWith(Number),
    })
    .from(users)
    .leftJoin(submissions, eq(submissions.uid, users.uid))
    .where(includeStaff ? undefined : eq(users.role, "student"))
    .groupBy(users.uid)
    .orderBy(desc(users.total_xp), asc(users.email));

  return rows.map(({ last_login_at, ...r }) => ({
    ...r,
    last_login: last_login_at.toISOString().slice(0, 10),
  }));
}
```

- [ ] **Step 8: Тест давахыг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: PASS, нийт 30 + 3 + 4 + 2 = 39 тест, `ℹ fail 0`.

- [ ] **Step 9: Checkpoint**

Run: `npx tsc --noEmit -p . && git status --short src/lib/db`

---

### Task 6: `contests.ts`

**Files:**
- Create: `src/lib/db/contests.ts`, `src/lib/db/contests.test.ts`

**Interfaces:**
- Consumes: `getDb` (Task 2), `PublicTestCase` (`@/lib/types`), test helper-ууд
- Produces (`@/lib/db/contests`, одоогийн `src/lib/firebase/contests.ts`-тэй ижил):
  `Contest`, `ContestStatus`, `contestStatus(c, now?)`, `ContestProblem`, `ContestProblemPrivate`,
  `Participant`, `listContests()`, `getContest(id)`, `upsertContest(contest)`, `deleteContest(id)`,
  `listProblems(contestId)`, `getProblem(contestId, problemId)`, `getProblemPrivate(contestId, problemId)`,
  `upsertProblem(contestId, problem, privateData)`, `deleteProblem(contestId, problemId)`,
  `getParticipant(contestId, uid)`, `listParticipants(contestId)`,
  `registerParticipant(contestId, user: { uid; name: string | null; email })`,
  `applySubmissionScore(params: { contestId; uid; problemId; score; code; passedTests; totalTests }): Promise<{ improved: boolean; bestScore: number }>`

- [ ] **Step 1: Бүтэлгүйтэх тест бичих: `src/lib/db/contests.test.ts`**

```ts
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { addUser, resetDb } from "@/lib/db/test-helpers";
import { closeDb, getDb } from "@/lib/db/client";
import {
  contestParticipants,
  contestProblemAnswers,
  contestProblems,
  contestSubmissions,
} from "@/lib/db/schema";
import {
  applySubmissionScore,
  contestStatus,
  deleteContest,
  deleteProblem,
  getContest,
  getParticipant,
  getProblem,
  getProblemPrivate,
  listContests,
  listParticipants,
  listProblems,
  registerParticipant,
  upsertContest,
  upsertProblem,
  type Contest,
  type ContestProblem,
} from "@/lib/db/contests";

beforeEach(resetDb);
after(closeDb);

const contest: Contest = {
  id: "spring-cup",
  title: "Хаврын тэмцээн",
  description: "d",
  starts_at: Date.parse("2026-03-01T09:00:00Z"),
  ends_at: Date.parse("2026-03-01T12:00:00Z"),
};
const problem: ContestProblem = {
  id: "p1",
  title: "Нийлбэр",
  prompt: "a + b",
  order: 1,
  points: 100,
  starter_code: "",
  public_test_cases: [{ input: "1 2", expected_output: "3" }],
};

async function setupContestWithStudent(): Promise<void> {
  await addUser("s1");
  await upsertContest(contest);
  await upsertProblem(contest.id, problem, { hidden_test_cases: [] });
  await upsertProblem(contest.id, { ...problem, id: "p2", order: 2 }, { hidden_test_cases: [] });
  await registerParticipant(contest.id, { uid: "s1", name: "Бат", email: "s1@shineue.edu.mn" });
}

const score = (problemId: string, value: number) =>
  applySubmissionScore({
    contestId: contest.id,
    uid: "s1",
    problemId,
    score: value,
    code: "print(3)",
    passedTests: 1,
    totalTests: 2,
  });

test("contestStatus follows the clock", () => {
  assert.equal(contestStatus(contest, contest.starts_at - 1), "upcoming");
  assert.equal(contestStatus(contest, contest.starts_at), "running");
  assert.equal(contestStatus(contest, contest.ends_at), "running");
  assert.equal(contestStatus(contest, contest.ends_at + 1), "finished");
});

test("contests round-trip and list newest first", async () => {
  const later = { ...contest, id: "autumn-cup", starts_at: contest.starts_at + 86_400_000 };
  await upsertContest(contest);
  await upsertContest(later);
  assert.deepEqual(await getContest(contest.id), contest);
  assert.deepEqual((await listContests()).map((c) => c.id), ["autumn-cup", "spring-cup"]);
  assert.equal(await getContest("Bad Id"), null);
  await upsertContest({ ...contest, title: "Шинэ" });
  assert.equal((await getContest(contest.id))?.title, "Шинэ");
});

test("problems keep hidden tests apart and are replaced on upsert", async () => {
  await upsertContest(contest);
  await upsertProblem(contest.id, { ...problem, id: "p2", order: 2 }, { hidden_test_cases: [] });
  await upsertProblem(contest.id, problem, {
    hidden_test_cases: [{ input: "5 5", expected_output: "10" }],
  });
  assert.deepEqual((await listProblems(contest.id)).map((p) => p.id), ["p1", "p2"]);
  assert.deepEqual(await getProblem(contest.id, "p1"), problem);
  assert.deepEqual(await getProblemPrivate(contest.id, "p1"), {
    hidden_test_cases: [{ input: "5 5", expected_output: "10" }],
  });
  await upsertProblem(contest.id, { ...problem, points: 50 }, { hidden_test_cases: [] });
  assert.equal((await getProblem(contest.id, "p1"))?.points, 50);
  assert.deepEqual(await getProblemPrivate(contest.id, "p1"), { hidden_test_cases: [] });

  await deleteProblem(contest.id, "p1");
  assert.equal(await getProblem(contest.id, "p1"), null);
  assert.equal(await getProblemPrivate(contest.id, "p1"), null);
});

test("registerParticipant is idempotent", async () => {
  await setupContestWithStudent();
  await registerParticipant(contest.id, { uid: "s1", name: "Бат", email: "s1@shineue.edu.mn" });
  assert.deepEqual(await getParticipant(contest.id, "s1"), {
    uid: "s1",
    name: "Бат",
    email: "s1@shineue.edu.mn",
    scores: {},
    total: 0,
    last_improved_at: null,
  });
  assert.equal((await getDb().select().from(contestParticipants)).length, 1);
});

test("the best score per problem is kept and every attempt is logged", async () => {
  await setupContestWithStudent();
  assert.deepEqual(await score("p1", 50), { improved: true, bestScore: 50 });
  assert.deepEqual(await score("p1", 25), { improved: false, bestScore: 50 });
  assert.deepEqual(await score("p1", 100), { improved: true, bestScore: 100 });

  const p = await getParticipant(contest.id, "s1");
  assert.deepEqual(p?.scores, { p1: 100 });
  assert.equal(p?.total, 100);
  assert.ok(p?.last_improved_at);
  assert.equal((await getDb().select().from(contestSubmissions)).length, 3);
});

test("concurrent improvements on different problems add up", async () => {
  await setupContestWithStudent();
  await Promise.all([score("p1", 40), score("p2", 60)]);
  const p = await getParticipant(contest.id, "s1");
  assert.deepEqual(p?.scores, { p1: 40, p2: 60 });
  assert.equal(p?.total, 100);
});

test("an unregistered student is rejected and nothing is logged", async () => {
  await addUser("s1");
  await upsertContest(contest);
  await assert.rejects(score("p1", 50), /Оролцогч бүртгэлгүй байна/);
  assert.equal((await getDb().select().from(contestSubmissions)).length, 0);
});

test("participants rank by total, then earliest improvement; never-improved last", async () => {
  await upsertContest(contest);
  for (const uid of ["a", "b", "c", "d"]) await addUser(uid);
  await getDb().insert(contestParticipants).values([
    { contest_id: contest.id, uid: "a", email: "a", total: 100, last_improved_at: new Date("2026-03-01T10:30:00Z") },
    { contest_id: contest.id, uid: "b", email: "b", total: 100, last_improved_at: new Date("2026-03-01T10:00:00Z") },
    { contest_id: contest.id, uid: "c", email: "c", total: 50, last_improved_at: new Date("2026-03-01T09:30:00Z") },
    { contest_id: contest.id, uid: "d", email: "d", total: 0, last_improved_at: null },
  ]);
  assert.deepEqual((await listParticipants(contest.id)).map((p) => p.uid), ["b", "a", "c", "d"]);
});

test("deleteContest removes problems, answers, participants and attempts", async () => {
  await setupContestWithStudent();
  await score("p1", 50);
  await deleteContest(contest.id);
  const db = getDb();
  assert.equal(await getContest(contest.id), null);
  assert.equal((await db.select().from(contestProblems)).length, 0);
  assert.equal((await db.select().from(contestProblemAnswers)).length, 0);
  assert.equal((await db.select().from(contestParticipants)).length, 0);
  assert.equal((await db.select().from(contestSubmissions)).length, 0);
});
```

- [ ] **Step 2: Тест бүтэлгүйтэхийг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: FAIL. "Cannot find module '@/lib/db/contests'" гэсэн алдаа гарна.

- [ ] **Step 3: `src/lib/db/contests.ts` бичих**

```ts
import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  contestParticipants,
  contestProblemAnswers,
  contestProblems,
  contests,
  contestSubmissions,
} from "@/lib/db/schema";
import type { PublicTestCase } from "@/lib/types";

export interface Contest {
  id: string;
  title: string;
  description: string;
  /** epoch ms */
  starts_at: number;
  ends_at: number;
}

export type ContestStatus = "upcoming" | "running" | "finished";

export function contestStatus(c: Contest, now = Date.now()): ContestStatus {
  if (now < c.starts_at) return "upcoming";
  if (now <= c.ends_at) return "running";
  return "finished";
}

export interface ContestProblem {
  id: string;
  title: string;
  prompt: string;
  order: number;
  /** Max score; partial credit per passed test. */
  points: number;
  starter_code?: string;
  public_test_cases: PublicTestCase[];
}

export interface ContestProblemPrivate {
  hidden_test_cases: PublicTestCase[];
}

export interface Participant {
  uid: string;
  name: string | null;
  email: string;
  /** problem id → best score */
  scores: Record<string, number>;
  total: number;
  /** epoch ms of the submission that last improved the total (tiebreak). */
  last_improved_at: number | null;
}

/* ------------------------------- contests ------------------------------ */

function toContest(r: typeof contests.$inferSelect): Contest {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    starts_at: r.starts_at.getTime(),
    ends_at: r.ends_at.getTime(),
  };
}

export async function listContests(): Promise<Contest[]> {
  const rows = await getDb().select().from(contests).orderBy(desc(contests.starts_at));
  return rows.map(toContest);
}

export async function getContest(id: string): Promise<Contest | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const [row] = await getDb().select().from(contests).where(eq(contests.id, id)).limit(1);
  return row ? toContest(row) : null;
}

export async function upsertContest(contest: Contest): Promise<void> {
  const data = {
    title: contest.title,
    description: contest.description,
    starts_at: new Date(contest.starts_at),
    ends_at: new Date(contest.ends_at),
  };
  await getDb()
    .insert(contests)
    .values({ id: contest.id, ...data })
    .onConflictDoUpdate({ target: contests.id, set: data });
}

/** Also deletes problems, participants and their attempts (FK cascade). */
export async function deleteContest(id: string): Promise<void> {
  await getDb().delete(contests).where(eq(contests.id, id));
}

/* ------------------------------- problems ------------------------------ */

function toProblem(r: typeof contestProblems.$inferSelect): ContestProblem {
  return {
    id: r.id,
    title: r.title,
    prompt: r.prompt,
    order: r.order,
    points: r.points,
    starter_code: r.starter_code ?? undefined,
    public_test_cases: r.public_test_cases,
  };
}

function problemKey(contestId: string, problemId: string) {
  return and(eq(contestProblems.contest_id, contestId), eq(contestProblems.id, problemId));
}

export async function listProblems(contestId: string): Promise<ContestProblem[]> {
  const rows = await getDb()
    .select()
    .from(contestProblems)
    .where(eq(contestProblems.contest_id, contestId))
    .orderBy(asc(contestProblems.order), asc(contestProblems.id));
  return rows.map(toProblem);
}

export async function getProblem(
  contestId: string,
  problemId: string
): Promise<ContestProblem | null> {
  const [row] = await getDb()
    .select()
    .from(contestProblems)
    .where(problemKey(contestId, problemId))
    .limit(1);
  return row ? toProblem(row) : null;
}

export async function getProblemPrivate(
  contestId: string,
  problemId: string
): Promise<ContestProblemPrivate | null> {
  const [row] = await getDb()
    .select({ hidden_test_cases: contestProblemAnswers.hidden_test_cases })
    .from(contestProblemAnswers)
    .where(
      and(
        eq(contestProblemAnswers.contest_id, contestId),
        eq(contestProblemAnswers.problem_id, problemId)
      )
    )
    .limit(1);
  return row ?? null;
}

/** Writes public + private parts together; replaces the whole problem. */
export async function upsertProblem(
  contestId: string,
  problem: ContestProblem,
  privateData: ContestProblemPrivate
): Promise<void> {
  const data = {
    title: problem.title,
    prompt: problem.prompt,
    order: problem.order,
    points: problem.points,
    starter_code: problem.starter_code ?? null,
    public_test_cases: problem.public_test_cases,
  };
  await getDb().transaction(async (tx) => {
    await tx
      .insert(contestProblems)
      .values({ contest_id: contestId, id: problem.id, ...data })
      .onConflictDoUpdate({ target: [contestProblems.contest_id, contestProblems.id], set: data });
    await tx
      .insert(contestProblemAnswers)
      .values({
        contest_id: contestId,
        problem_id: problem.id,
        hidden_test_cases: privateData.hidden_test_cases,
      })
      .onConflictDoUpdate({
        target: [contestProblemAnswers.contest_id, contestProblemAnswers.problem_id],
        set: { hidden_test_cases: privateData.hidden_test_cases },
      });
  });
}

export async function deleteProblem(contestId: string, problemId: string): Promise<void> {
  await getDb().delete(contestProblems).where(problemKey(contestId, problemId));
}

/* ----------------------------- participants ---------------------------- */

function toParticipant(r: typeof contestParticipants.$inferSelect): Participant {
  return {
    uid: r.uid,
    name: r.name,
    email: r.email,
    scores: r.scores,
    total: r.total,
    last_improved_at: r.last_improved_at?.getTime() ?? null,
  };
}

function participantKey(contestId: string, uid: string) {
  return and(eq(contestParticipants.contest_id, contestId), eq(contestParticipants.uid, uid));
}

export async function getParticipant(contestId: string, uid: string): Promise<Participant | null> {
  const [row] = await getDb()
    .select()
    .from(contestParticipants)
    .where(participantKey(contestId, uid))
    .limit(1);
  return row ? toParticipant(row) : null;
}

/** Ranked: total desc, earlier improvement wins ties (never-improved last). */
export async function listParticipants(contestId: string): Promise<Participant[]> {
  const rows = await getDb()
    .select()
    .from(contestParticipants)
    .where(eq(contestParticipants.contest_id, contestId))
    .orderBy(
      desc(contestParticipants.total),
      sql`${contestParticipants.last_improved_at} asc nulls last`,
      asc(contestParticipants.registered_at)
    );
  return rows.map(toParticipant);
}

export async function registerParticipant(
  contestId: string,
  user: { uid: string; name: string | null; email: string }
): Promise<void> {
  await getDb()
    .insert(contestParticipants)
    .values({ contest_id: contestId, uid: user.uid, name: user.name, email: user.email })
    .onConflictDoNothing();
}

/**
 * Records an attempt; the participant keeps their BEST score per problem.
 * Returns the score of this attempt and whether it improved the total.
 */
export async function applySubmissionScore(params: {
  contestId: string;
  uid: string;
  problemId: string;
  score: number;
  code: string;
  passedTests: number;
  totalTests: number;
}): Promise<{ improved: boolean; bestScore: number }> {
  const key = participantKey(params.contestId, params.uid);

  return getDb().transaction(async (tx) => {
    // Lock the participant row: concurrent submissions serialize here, so
    // neither can overwrite the other's score.
    const [participant] = await tx.select().from(contestParticipants).where(key).for("update");
    if (!participant) throw new Error("Оролцогч бүртгэлгүй байна.");

    // Attempt audit trail (append-only). Written after the check — it
    // references the participant row.
    await tx.insert(contestSubmissions).values({
      contest_id: params.contestId,
      uid: params.uid,
      problem_id: params.problemId,
      code: params.code,
      score: params.score,
      passed_tests: params.passedTests,
      total_tests: params.totalTests,
    });

    const prev = participant.scores[params.problemId] ?? 0;
    if (params.score <= prev) {
      return { improved: false, bestScore: prev };
    }
    const scores = { ...participant.scores, [params.problemId]: params.score };
    const total = Object.values(scores).reduce((s, x) => s + x, 0);
    await tx
      .update(contestParticipants)
      .set({ scores, total, last_improved_at: sql`now()` })
      .where(key);
    return { improved: true, bestScore: params.score };
  });
}
```

- [ ] **Step 4: Тест давахыг шалгах**

Run: `npm test`
Хүлээгдэх үр дүн: PASS, нийт 39 + 9 = 48 тест, `ℹ fail 0`.

- [ ] **Step 5: Checkpoint**

Run: `npx tsc --noEmit -p . && git status --short src/lib/db`

---

### Task 7: Скриптүүдийг шилжүүлж, dev өгөгдлийн санг бөглөх

**Files:**
- Modify: `scripts/import-content.ts`, `scripts/seed-challenges.ts`, `scripts/seed-data-analyst.ts`,
  `scripts/set-role.ts`, `scripts/list-users.ts`, `scripts/make-test-session.ts`, `package.json`
- Delete: `scripts/deploy-rules.ts`, `scripts/smoke-firestore.ts`, `scripts/migrate-duplicate-users.ts`,
  `scripts/fix-piston-tunnel.sh`

**Interfaces:**
- Consumes: `closeDb`, `getDb` (Task 2); `upsertModule` (Task 3); `upsertChallenge` (Task 4);
  `ensureUserProfile`, `updateUserRole`, `deleteUserCascade` (Task 3); `npm run script` (Task 1)
- Produces: `npm run db:seed`

Бүх скрипт `npm run script -- scripts/<file>.ts [args]`-ээр ажиллана. Энэ нь `.env.local`-ийг
ачаалж, `react-server` condition-ийг идэвхжүүлдэг тул скрипт доторх гар аргаар env уншдаг
давталтыг хасна.

- [ ] **Step 1: `scripts/import-content.ts`-ийг бүхэлд нь солих**

```ts
/**
 * Imports content/modules/*.mdx into the `modules` table (frontmatter →
 * columns, body → lesson_mdx). Safe to re-run — it overwrites module rows
 * with the file contents.
 *
 * Run: npm run script -- scripts/import-content.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { closeDb } from "../src/lib/db/client";
import { upsertModule } from "../src/lib/db/modules";

async function main() {
  const dir = resolve(__dirname, "../content/modules");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(readFileSync(join(dir, file), "utf8"));
    const id = data.module_id as string;
    await upsertModule({
      id,
      title: data.title,
      syllabus_ref: data.syllabus_ref ?? "",
      order: data.order,
      description: data.description ?? "",
      lesson_mdx: content.trim(),
    });
    console.log("imported", id, "—", data.title);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 2: `scripts/seed-challenges.ts`-ийг засах (өгөгдлийн хэсэг өөрчлөгдөхгүй)**

2a. Файлын эхлэл. Хуучин код:

```ts
/**
 * Seeds coding challenges for module-01.
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/seed-challenges.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { getDb } = await import("../src/lib/firebase/admin");
  const db = getDb();

  interface SeedChallenge {
    id: string;
    public: Record<string, unknown>;
    hidden?: { input: string; expected_output: string }[];
    hint?: string;
    private?: Record<string, unknown>;
  }
```

Шинэ код:

```ts
/**
 * Seeds the challenges of modules 1-3. Run scripts/import-content.ts first —
 * challenges reference their module. Safe to re-run.
 * Run: npm run script -- scripts/seed-challenges.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertChallenge } from "../src/lib/db/challenges";
import type { Challenge, ChallengePrivate, PublicTestCase } from "../src/lib/types";

async function main() {
  interface SeedChallenge {
    id: string;
    public: Omit<Challenge, "id">;
    hidden?: PublicTestCase[];
    hint?: string;
    private?: ChallengePrivate;
  }
```

2b. Файлын төгсгөл. Хуучин код:

```ts
  for (const ch of challenges) {
    await db.collection("challenges").doc(ch.id).set(ch.public);
    await db
      .collection("challenges")
      .doc(ch.id)
      .collection("private")
      .doc("answers")
      .set({
        ...(ch.hidden ? { hidden_test_cases: ch.hidden } : {}),
        ...(ch.hint ? { hint: ch.hint } : {}),
        ...(ch.private ?? {}),
      });
    console.log("seeded", ch.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Шинэ код:

```ts
  for (const ch of challenges) {
    await upsertChallenge(
      { ...ch.public, id: ch.id },
      {
        ...(ch.hidden ? { hidden_test_cases: ch.hidden } : {}),
        ...(ch.hint ? { hint: ch.hint } : {}),
        ...(ch.private ?? {}),
      }
    );
    console.log("seeded", ch.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 3: `scripts/seed-data-analyst.ts`-ийг засах (өгөгдлийн хэсэг өөрчлөгдөхгүй)**

3a. Файлын эхлэл. Хуучин код:

```ts
/**
 * Seeds the Data Analyst track: modules 4-6 (beginner → advanced)
 * with lessons (worked examples included) and 9 challenges.
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/seed-data-analyst.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { getDb } = await import("../src/lib/firebase/admin");
  const db = getDb();
```

Шинэ код:

```ts
/**
 * Seeds the Data Analyst track: modules 4-6 (beginner → advanced)
 * with lessons (worked examples included) and 9 challenges. Safe to re-run.
 * Run: npm run script -- scripts/seed-data-analyst.ts
 */
import { closeDb } from "../src/lib/db/client";
import { upsertChallenge } from "../src/lib/db/challenges";
import { upsertModule } from "../src/lib/db/modules";
import type { Challenge, ChallengePrivate, PublicTestCase } from "../src/lib/types";

async function main() {
```

3b. Модулийн давталт. Хуучин код:

```ts
  for (const mod of modules) {
    const { id, ...data } = mod;
    await db.collection("modules").doc(id).set(data);
    console.log("module seeded:", id);
  }
```

Шинэ код:

```ts
  for (const mod of modules) {
    await upsertModule(mod);
    console.log("module seeded:", mod.id);
  }
```

3c. `SeedChallenge` interface. Хуучин код:

```ts
  interface SeedChallenge {
    id: string;
    public: Record<string, unknown>;
    hidden?: { input: string; expected_output: string }[];
    hint?: string;
    private?: Record<string, unknown>;
  }
```

Шинэ код:

```ts
  interface SeedChallenge {
    id: string;
    public: Omit<Challenge, "id">;
    hidden?: PublicTestCase[];
    hint?: string;
    private?: ChallengePrivate;
  }
```

3d. Даалгаврын давталт болон `main()` дуудлага. Хуучин код:

```ts
  for (const ch of challenges) {
    await db.collection("challenges").doc(ch.id).set(ch.public);
    await db
      .collection("challenges")
      .doc(ch.id)
      .collection("private")
      .doc("answers")
      .set({
        ...(ch.hidden ? { hidden_test_cases: ch.hidden } : {}),
        ...(ch.hint ? { hint: ch.hint } : {}),
        ...(ch.private ?? {}),
      });
    console.log("challenge seeded:", ch.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Шинэ код:

```ts
  for (const ch of challenges) {
    await upsertChallenge(
      { ...ch.public, id: ch.id },
      {
        ...(ch.hidden ? { hidden_test_cases: ch.hidden } : {}),
        ...(ch.hint ? { hint: ch.hint } : {}),
        ...(ch.private ?? {}),
      }
    );
    console.log("challenge seeded:", ch.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 4: `scripts/set-role.ts`-ийг бүхэлд нь солих**

```ts
/**
 * Sets a user's role by email.
 * Run: npm run script -- scripts/set-role.ts <email> <student|teacher|admin>
 *
 * Note: the role is copied into the session JWT at sign-in, so the user
 * must sign out and back in to see the change in the UI.
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import type { UserRole } from "../src/lib/types";

const ROLES: UserRole[] = ["student", "teacher", "admin"];

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role as UserRole)) {
    console.error("Usage: npm run script -- scripts/set-role.ts <email> <student|teacher|admin>");
    process.exitCode = 1;
    return;
  }

  const updated = await getDb()
    .update(users)
    .set({ role: role as UserRole })
    .where(eq(users.email, email))
    .returning({ uid: users.uid });
  if (updated.length === 0) {
    console.error(`No user with email ${email} — they must sign in once first.`);
    process.exitCode = 1;
    return;
  }
  for (const u of updated) console.log(`${email} (${u.uid}) → role=${role}`);
  console.log("Note: the user must sign out/in for the UI to reflect the new role.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 5: `scripts/list-users.ts`-ийг бүхэлд нь солих**

```ts
/**
 * Lists all users.
 * Run: npm run script -- scripts/list-users.ts
 */
import { asc } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";

async function main() {
  const rows = await getDb().select().from(users).orderBy(asc(users.email));
  console.log("users table:", rows.length, "row(s)");
  for (const u of rows) {
    console.log(
      `- ${u.uid}: ${u.email} | role=${u.role} | xp=${u.total_xp} | modules=${JSON.stringify(u.unlocked_modules)}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 6: `scripts/make-test-session.ts`-ийг бүхэлд нь солих**

```ts
/**
 * TEMP dev helper: creates a profile for a fake student and prints a valid
 * session cookie for local UI testing (bypasses Google sign-in).
 * --teacher makes the fake user a teacher; --cleanup deletes it instead.
 * Run: npm run script -- scripts/make-test-session.ts [--teacher | --cleanup]
 */
import { encode } from "next-auth/jwt";
import { closeDb } from "../src/lib/db/client";
import { deleteUserCascade, ensureUserProfile, updateUserRole } from "../src/lib/db/users";

const UID = "ui-test-student";
const EMAIL = "ui-test@shineue.edu.mn";
const NAME = "Тест Сурагч";

async function main() {
  if (process.argv.includes("--cleanup")) {
    await deleteUserCascade(UID);
    console.log("deleted", UID, "(incl. submissions, certificates, contest entries)");
    return;
  }

  await ensureUserProfile({ uid: UID, email: EMAIL, name: NAME, photo_url: null });

  const role = process.argv.includes("--teacher") ? "teacher" : "student";
  // Staff checks read the database role, not the JWT copy — keep both in sync.
  await updateUserRole(UID, role);

  const cookie = await encode({
    token: { sub: UID, name: NAME, email: EMAIL, role },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
  });
  console.log(cookie);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
```

- [ ] **Step 7: Хуучирсан скриптүүдийг устгах**

```bash
git rm -q scripts/deploy-rules.ts scripts/smoke-firestore.ts scripts/migrate-duplicate-users.ts scripts/fix-piston-tunnel.sh
```

- [ ] **Step 8: `package.json`-д `db:seed` нэмэх**

`"db:migrate"` мөрийн дараа нэмнэ:

```json
    "db:seed": "npm run script -- scripts/import-content.ts && npm run script -- scripts/seed-challenges.ts && npm run script -- scripts/seed-data-analyst.ts",
```

- [ ] **Step 9: Typecheck хийх**

Run: `npx tsc --noEmit -p .`
Хүлээгдэх үр дүн: алдаагүй. Хэрэв seed-ийн өгөгдөл `Omit<Challenge, "id">`-тэй таарахгүй бол
tsc тэр литералыг заана. Тэр үед **өгөгдлийг** зөв төрөлд тааруулж засна, төрлийг сулруулахгүй.

- [ ] **Step 10: Dev өгөгдлийн санг бөглөж, давтан ажиллуулахад асуудалгүйг шалгах**

```bash
npm run db:seed && npm run db:seed && docker exec coding-db psql -U coding -d coding -Atc "select (select count(*) from modules), (select count(*) from challenges), (select count(*) from challenge_answers)"
```

Хүлээгдэх үр дүн: "imported / seeded" гэсэн мөрүүд хоёр удаа гарна. Эцэст нь `6|16|16`
(6 модуль, 16 даалгавар, 16 хариулт). Хоёр дахь удаа ажиллуулахад тоо нэмэгдэхгүй.

- [ ] **Step 11: `set-role`, `list-users`, `make-test-session` скриптүүдийг шалгах**

```bash
npm run script -- scripts/make-test-session.ts > /dev/null && npm run script -- scripts/list-users.ts && npm run script -- scripts/set-role.ts ui-test@shineue.edu.mn teacher && npm run script -- scripts/make-test-session.ts --cleanup && npm run script -- scripts/list-users.ts
```

Хүлээгдэх үр дүн: эхлээд `users table: 1 row(s)` болон `ui-test-student … role=student …
modules=["module-01"]` гарна. Дараа нь `… → role=teacher`, `deleted ui-test-student …`, эцэст нь
`users table: 0 row(s)`.

- [ ] **Step 12: Checkpoint**

Run: `npm test && git status --short scripts package.json`
Хүлээгдэх үр дүн: 48 тест PASS. 6 скрипт өөрчлөгдсөн, 4 скрипт устсан.

---

### Task 8: Аппыг db давхарга руу шилжүүлж, Firebase-ийг хасах

**Files:**
- Modify: `src/lib/progression.ts`, `src/lib/teacher-actions.ts`, `@/lib/firebase/`-ээс import хийдэг
  бүх файл (Task-ийн эхэнд `grep`-ээр жагсаана), `src/auth.ts`, `src/auth.config.ts`,
  `src/proxy.ts`, `src/lib/types.ts`, `src/types/next-auth.d.ts`, `src/app/page.tsx`,
  `src/app/teacher/page.tsx`, `package.json`
- Delete: `src/lib/firebase/`, `firestore.rules`

**Interfaces:**
- Consumes: `@/lib/db/*`-ийн бүх экспорт (Task 3–6)

- [ ] **Step 1: `src/lib/progression.ts`-ийн import-уудыг солих**

Хуучин код:

```ts
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import { listChallengesByModule } from "@/lib/firebase/challenges";
import { listPassedChallengeIds } from "@/lib/firebase/submissions";
import { listModules } from "@/lib/firebase/modules";
```

Шинэ код:

```ts
import { listChallengesByModule } from "@/lib/db/challenges";
import { listPassedChallengeIds } from "@/lib/db/submissions";
import { listModules } from "@/lib/db/modules";
import { unlockModule } from "@/lib/db/users";
```

- [ ] **Step 2: `src/lib/progression.ts` доторх модуль нээх бичилтийг солих**

Хуучин код:

```ts
  await getDb()
    .doc(`users/${uid}`)
    .update({ unlocked_modules: FieldValue.arrayUnion(next.id) });
```

Шинэ код:

```ts
  await unlockModule(uid, next.id);
```

- [ ] **Step 3: `src/lib/teacher-actions.ts`-ийг засах**

3a. Хуучин код:

```ts
import { getUserProfile } from "@/lib/firebase/users";
```

Шинэ код:

```ts
import { deleteUserCascade, getUserProfile, updateUserRole } from "@/lib/db/users";
```

3b. Хуучин код:

```ts
/** Every action re-checks the Firestore role — never trust the client. */
```

Шинэ код:

```ts
/** Every action re-checks the database role — never trust the client. */
```

3c. Хуучин код:

```ts
  const { getDb } = await import("@/lib/firebase/admin");
  await getDb().doc(`users/${uid}`).update({ role });
  revalidatePath("/teacher");
```

Шинэ код:

```ts
  await updateUserRole(uid, role);
  revalidatePath("/teacher");
```

3d. Хуучин код:

```ts
  const { getDb } = await import("@/lib/firebase/admin");
  const db = getDb();

  await db.recursiveDelete(db.collection("users").doc(uid));

  const certs = await db.collection("certificates").where("uid", "==", uid).get();
  await Promise.all(certs.docs.map((d) => d.ref.delete()));

  const contests = await db.collection("contests").get();
  await Promise.all(
    contests.docs.map((c) =>
      db.recursiveDelete(c.ref.collection("participants").doc(uid))
    )
  );

  revalidatePath("/teacher");
```

Шинэ код:

```ts
  // ON DELETE CASCADE removes submissions, certificates and contest entries.
  await deleteUserCascade(uid);

  revalidatePath("/teacher");
```

- [ ] **Step 4: Бусад бүх import замыг солих**

```bash
grep -rlZ "@/lib/firebase/" src --include=*.ts --include=*.tsx | grep -zv "^src/lib/firebase/" | xargs -0 sed -i 's#@/lib/firebase/#@/lib/db/#g'
grep -rn "@/lib/firebase/" src | grep -v "^src/lib/firebase/"
```

Хүлээгдэх үр дүн: хоёр дахь команд юу ч хэвлэхгүй.

- [ ] **Step 5: Firestore-ийг дурдсан тайлбар, мессежүүдийг засах**

5a. `src/auth.config.ts`. Хуучин: ` * Edge-safe auth config. Keep Node-only imports (firebase-admin etc.)`
→ Шинэ: ` * Edge-safe auth config. Keep Node-only imports (the database client etc.)`

5b. `src/auth.ts`. Хуучин: ` * so firebase-admin never ends up in the proxy bundle.`
→ Шинэ: ` * so the database client never ends up in the proxy bundle.`

5c. `src/auth.ts`. Хуучин: `        // every sign-in would create a fresh Firestore profile.`
→ Шинэ: `        // every sign-in would create a fresh user row.`

5d. `src/proxy.ts`. Хуучин: `// firebase-admin import. Shares AUTH_SECRET with the main instance,`
→ Шинэ: `// database import. Shares AUTH_SECRET with the main instance,`

5e. `src/app/teacher/page.tsx`. Хуучин: `  // The Firestore role is authoritative (the JWT copy can be stale).`
→ Шинэ: `  // The database role is authoritative (the JWT copy can be stale).`

5f. `src/types/next-auth.d.ts`. Хуучин код:

```ts
      /** Google account id (`sub` claim) — Firestore users/{uid} doc id. */
```

Шинэ код:

```ts
      /** Google account id (`sub` claim) — users.uid primary key. */
```

5g. `src/lib/types.ts`. Хуучин код:

```ts
 * Client-visible challenge document (challenges/{id}).
 * Hidden test cases, MCQ answers and mark schemes live in
 * challenges/{id}/private/answers and must never reach the client.
```

Шинэ код:

```ts
 * Client-visible challenge (challenges table).
 * Hidden test cases, MCQ answers and mark schemes live in the
 * challenge_answers table and must never reach the client.
```

Үүнтэй адил хоёр мөрөнд `the private doc.`-ийг `challenge_answers.` болгож солино:
`/** MCQ answer options — the correct index stays in challenge_answers. */` болон
`/** Whether a hint exists — the text itself stays in challenge_answers. */`.

5h. `src/app/page.tsx`. Хуучин код:

```tsx
            Firestore-той холбогдож чадсангүй. .env.local доторх FIREBASE_*
            тохиргоог шалгана уу.
```

Шинэ код:

```tsx
            Өгөгдлийн сантай холбогдож чадсангүй. Docker (npm run db:up) ажиллаж
            байгаа эсэх, .env.local доторх DATABASE_URL-ийг шалгана уу.
```

- [ ] **Step 6: Firebase-ийг устгах**

```bash
git rm -rq src/lib/firebase firestore.rules && npm uninstall firebase-admin
```

- [ ] **Step 7: Firebase огт үлдээгүйг шалгах**

```bash
grep -rn -i "firebase\|firestore" src scripts package.json .env.example docker-compose.yml; echo "exit=$?"
```

Хүлээгдэх үр дүн: зөвхөн `exit=1` гэж хэвлэгдэнэ, тохирох мөр олдохгүй.

- [ ] **Step 8: Typecheck болон тест**

Run: `npx tsc --noEmit -p . && npm test`
Хүлээгдэх үр дүн: tsc алдаагүй, 48 тест PASS.

- [ ] **Step 9: Checkpoint**

Run: `git status --short`

---

### Task 9: Баримт бичиг, lint, бүрэн шалгалт

**Files:**
- Modify: `README.md`, `src/app/teacher/contests/page.tsx:48`, `src/app/teacher/news/page.tsx:42`

**Interfaces:**
- Consumes: Task 1–8-ийн бүх үр дүн

- [ ] **Step 1: Өмнөөс байсан lint алдааг засах**

`src/app/teacher/contests/page.tsx:48`. Хуучин код:

```tsx
              Тэмцээн үүсгээгүй байна — "Шинэ тэмцээн" дарж эхлээрэй.
```

Шинэ код:

```tsx
              Тэмцээн үүсгээгүй байна — &ldquo;Шинэ тэмцээн&rdquo; дарж эхлээрэй.
```

`src/app/teacher/news/page.tsx:42`. Хуучин код:

```tsx
              Мэдээ нийтлээгүй байна — "Шинэ мэдээ" дарж эхлээрэй.
```

Шинэ код:

```tsx
              Мэдээ нийтлээгүй байна — &ldquo;Шинэ мэдээ&rdquo; дарж эхлээрэй.
```

- [ ] **Step 2: README-ийн хэсгүүдийг солих**

2a. `## Стек` хэсэг доторх Firestore-ийн мөр. Хуучин:
`- **Firestore** — зөвхөн сервер талын Admin SDK-гаар (клиент хандалт rules-ээр бүрэн хаалттай)`
→ Шинэ:
`- **PostgreSQL 17** (Docker) + **Drizzle ORM** — зөвхөн Next.js сервер талаас хандана`

2b. `## Хөгжүүлэлтийн орчин` гарчгаас `## Контент нэмэх` гарчиг хүртэлх хэсгийг бүхэлд нь
(`## Скриптүүд` хэсгийг оруулаад) дараах текстээр солино:

````markdown
## Хөгжүүлэлтийн орчин

Шаардлага: Node 24, Docker Desktop.

```bash
npm install
cp .env.example .env.local   # дараа нь доорх хүснэгтийн дагуу бөглөнө
npm run db:up                # Postgres (127.0.0.1:5433) + Piston (127.0.0.1:2000)
npm run piston:setup         # Python 3.12-ыг Piston-д суулгана (нэг удаа)
npm run db:migrate           # хүснэгтүүдийг үүсгэнэ
npm run db:seed              # MDX хичээлүүд + бүх даалгавар
npm run dev                  # http://localhost:3001
```

`.env.local`:

| Хувьсагч | Хаанаас |
| --- | --- |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → Credentials → OAuth client (redirect: `<origin>/api/auth/callback/google`) |
| `POSTGRES_PASSWORD` | Дурын урт санамсаргүй тэмдэгт мөр (жишээ нь `openssl rand -hex 24`) |
| `DATABASE_URL` / `TEST_DATABASE_URL` | `.env.example`-ийн загварт `POSTGRES_PASSWORD`-ийг орлуулна |
| `PISTON_URL` | `http://localhost:2000/api/v2` |

## Скриптүүд

| Команд | Үүрэг |
| --- | --- |
| `npm run db:up` | Docker контейнеруудыг асаах |
| `npm run db:generate` | `src/lib/db/schema.ts` өөрчлөгдсөний дараа шинэ migration үүсгэх (`drizzle/`) |
| `npm run db:migrate` | Migration-уудыг хэрэглэх |
| `npm run db:seed` | Хичээл, даалгаврыг оруулах (дахин ажиллуулж болно) |
| `npm test` | Өгөгдлийн давхаргын integration тестүүд (`coding_test` сан дээр) |
| `npm run script -- scripts/set-role.ts <email> <role>` | Хэрэглэгчийг багш/сурагч болгох (дараа нь дахин нэвтэрнэ) |
| `npm run script -- scripts/list-users.ts` | Хэрэглэгчдийн жагсаалт |
| `npm run script -- scripts/make-test-session.ts [--teacher\|--cleanup]` | Локал UI тестийн хуурамч session (dev-only) |

````

2c. `## Контент нэмэх` хэсэг доторх хоёр мөр. Хуучин:
`- **Даалгавар**: \`scripts/seed-challenges.ts\`-д нэмээд дахин ажиллуулна.` → Шинэ:
`- **Даалгавар**: \`scripts/seed-challenges.ts\`-д нэмээд \`npm run db:seed\`-ийг дахин ажиллуулна.`
Мөн хуучин: `\`challenges/{id}/private/answers\`-д хадгалагдана` → Шинэ:
`\`challenge_answers\` хүснэгтэд хадгалагдана`.

2d. `## Production deploy` хэсгийг (дугаарласан 4 мөрийг оруулаад) дараах текстээр бүхэлд нь солино:

```markdown
## Production

Апп сургуулийн компьютер дээр Docker (Postgres, Piston) + Next.js production горимоор ажиллана.
Windows service, Cloudflare Tunnel, домайны тохиргооны заавар дараагийн шатанд нэмэгдэнэ.
```

2e. `## Архитектурын гол шийдвэрүүд` хэсгийн эхний гурван мөр. Хуучин код:

```markdown
- Firestore-т **клиент огт ханддаггүй** — бүх унших/бичих нь Next.js сервер (Admin SDK) дээр. XP, дүгнэлт, модуль нээгдэлт зэрэг бүх шийдвэр server-authoritative.
- Hint-ийн 30% суутгал: hint-ийн текст буцахаас **өмнө** `hint_used` Firestore-д бичигдэнэ.
- XP зөвхөн анхны амжилттай бодолтод, Firestore transaction дотор олгогдоно.
```

Шинэ код:

```markdown
- Өгөгдлийн санд **клиент огт ханддаггүй** — бүх унших/бичих нь Next.js сервер дээр (`src/lib/db/`). Postgres-ийн порт зөвхөн `127.0.0.1`-д нээлттэй. XP, дүгнэлт, модуль нээгдэлт зэрэг бүх шийдвэр server-authoritative.
- Hint-ийн 30% суутгал: hint-ийн текст буцахаас **өмнө** `hint_used` өгөгдлийн санд бичигдэнэ.
- XP зөвхөн анхны амжилттай бодолтод, submission мөрийг `FOR UPDATE`-ээр түгжсэн transaction дотор олгогдоно.
```

- [ ] **Step 3: Автомат шалгалтууд**

```bash
npx tsc --noEmit -p . && npm run lint && npm test && npm run build
```

Хүлээгдэх үр дүн: tsc алдаагүй. Lint-д **алдаа 0** (`_form`-ийн 2 анхааруулга өмнөөс байсан тул
үлдэж болно). 48 тест PASS. `next build` амжилттай дуусна.

- [ ] **Step 4: Dev server-ийг асааж, туршилтын session үүсгэх**

Dev server ажиллаж байгаа бол (`preview_list`) дахин асаана, эс бөгөөс `preview_start` ("dev")-ээр
асаана. Дараа нь:

```bash
npm run script -- scripts/make-test-session.ts
```

Хэвлэгдсэн утгыг built-in browser-ийн `javascript_tool`-ээр cookie болгож тохируулна:
`document.cookie = "authjs.session-token=<утга>; path=/"`. Утгыг чат руу хуулахгүй.

- [ ] **Step 5: Сурагчийн урсгалыг гараар шалгах (built-in browser)**

Алхам бүрийн дараа `preview_logs` (level: error) болон console алдааг шалгана:

1. `/`. Самбар 0 XP, 1 нээлттэй модультай харагдана. "Өгөгдлийн сантай холбогдож чадсангүй"
   гэсэн мессеж **гарахгүй**.
2. `/modules`. 6 модуль харагдана, зөвхөн эхнийх нь нээлттэй.
3. `/modules/module-01`. Хичээлийн MDX болон даалгаврын жагсаалт гарна.
4. Coding даалгавар (`ch-01-sum`). Буруу код илгээхэд тест унана. Hint авахад текст гарна.
   Зөв код (`print(a + b)` гэх мэт) илгээхэд давж, XP-ийн 70% олгогдоно.
5. MCQ, tracing, theory даалгавар тус бүрээс нэгийг бодож, дүгнэгдэж байгааг шалгана.
6. Модулийн бүх даалгаврыг бодоход дараагийн модуль нээгдэнэ.
7. `/leaderboard`. Туршилтын сурагч XP-тэйгээ харагдана.

- [ ] **Step 6: Багшийн урсгалыг гараар шалгах**

```bash
npm run script -- scripts/make-test-session.ts --teacher
```

Шинэ cookie-г тохируулаад:

1. `/teacher`. Сурагчдын жагсаалт тоонуудтайгаа харагдана.
2. `/teacher/news`. Мэдээ үүсгэхэд `/` болон `/news` дээр гарна. Засах, устгахад зөв ажиллана.
3. `/teacher/contests`. Одоо эхэлж байгаа тэмцээн болон бодлого үүсгэнэ.
4. Сурагчийн session руу буцаж (make-test-session дахин ажиллуулна), тэмцээнд бүртгүүлж, бодолт
   илгээнэ. `/contests/<id>/leaderboard` дээр оноо гарна.
5. `/teacher/content`. Даалгаврыг засаж хадгалахад өөрчлөлт хадгалагдана.

- [ ] **Step 7: Сертификат ба `/verify`**

Туршилтын сурагчаар бүх 16 даалгаврыг бодох нь урт тул сертификатын урсгалыг DB-ээр шалгана:

```bash
docker exec coding-db psql -U coding -d coding -c "insert into submissions (uid, challenge_id, passed, attempts) select 'ui-test-student', id, true, 1 from challenges on conflict (uid, challenge_id) do update set passed = true"
```

Дараа нь `/certificate` хуудсыг нээхэд гэрчилгээ гарна (PDF татах товчтой). Түүн дээрх
`/verify/<id>` холбоосыг **нэвтрээгүй** байдлаар нээхэд баталгаажуулалт харагдах ёстой
(cookie-г устгаад шалгана).

- [ ] **Step 8: Цэвэрлэгээ**

```bash
npm run script -- scripts/make-test-session.ts --cleanup
docker exec coding-db psql -U coding -d coding -Atc "select (select count(*) from users), (select count(*) from news), (select count(*) from contests)"
```

Туршилтын мэдээ, тэмцээнийг `/teacher` хэсгээс устгасан бол хүлээгдэх үр дүн нь `0|0|0`.
Устгаагүй бол `psql`-ээр `delete from news; delete from contests;` ажиллуулна.

- [ ] **Step 9: Эцсийн checkpoint**

Run: `git status --short`
Өөрчлөлтийн хураангуйг хэрэглэгчид танилцуулна. **Commit хийхгүй.** Хэрэглэгч "final code"
гэж хэлэхийг хүлээнэ.
