# Нийтийн шууд leaderboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Аккаунтгүй хүмүүс нүүр хуудаснаас тэмцээний ангилал сонгоод, 15 секунд тутам шинэчлэгдэх leaderboard-ийг (мөн цувралын «Бүгд» дэлгэцийг) нэвтрэлгүй харна.

**Architecture:** Тэмцээнд `is_public` багана нэмнэ. Нийтийн өгөгдлийг тэмцээн бүрээр `unstable_cache`-д 10 секунд хадгалж бүх үзэгч хуваалцана; нэр товчлох, uid/имэйл хасах, бодлогын нэр нуухыг сервер дээрх цэвэр функц (`liveView`) хийнэ. Шинэ `/live/...` хуудсууд server-rendered бөгөөд жижиг client компонент 15 секунд тутам `router.refresh()` дуудна.

**Tech Stack:** Next.js 16.2 App Router, React 19 + React Compiler, Drizzle 0.45 + Postgres, NextAuth v5, ApexCharts 4.7.0, `node:test` via tsx.

**Spec:** `docs/superpowers/specs/2026-11-25-public-live-leaderboard-design.md`

## Global Constraints

- Next 16.2, `cacheComponents` асаагаагүй → кэш нь `unstable_cache` (`next/cache`); `params`/`searchParams` нь Promise.
- React Compiler purity: client/server компонентын бие дотор `Date.now()` шууд дуудахгүй — lib функцийн default параметрээр авна (`raceEnd(endsAt, now = Date.now())`-ийн загвар); client тоолуур state + interval.
- Нийтийн замын угтвар: `/live`. Хайлтын системд: `robots: { index: false, follow: false }`.
- Тоонууд: шинэчлэлт **15 000 мс**; кэш `revalidate: 10`; шинэчлэлт дууссанаас **60 000 мс**-ийн дараа зогсоно; upcoming цонх **14 хоног**; finished цонх **3 хоног**; график эхний **10** (+ өөрөө).
- Client props-д **uid, имэйл** хэзээ ч орохгүй; аккаунтгүй үзэгчид **бүтэн нэр** орохгүй.
- Нэр товчлох: эхний үг бүтэн, бусад нь эхний үсэг + «.»; хоосон/`null` → «Оролцогч».
- `is_public` анхдагч `false`; нийтийн бүх зүйл (нүүр, `/live/[id]`, «Бүгд») зөвхөн `is_public = true`; бусад үед `/live` → 404.
- Текстүүд: «Нийтэд харуулах (нүүр хуудас, шууд leaderboard)», «● ЯГ ОДОО», «Бүгдийг харах», «Дүн харах», «15 с тутам шинэчлэгдэнэ», «Дууссан», «… дараа эхэлнэ».
- Commit: хэрэглэгч "commit push" гэх үед л. Task бүрийн commit алхам **хийгдэхгүй**.
- Production: migration-ийг deploy-оос өмнө (хэрэглэгч ажиллуулна).

## Review Focus

1. **Аккаунтгүй үзэгчийн хуудасны эх/RSC payload-д бүтэн нэр, uid, имэйл** (график ч гэсэн) → харагдах ёсгүй. Task 2 (`liveView` JSON шалгалт) ба Task 6 (curl grep).
2. **Тэмцээн эхлэхээс өмнө бодлогын нэр** (`/live` болон одоогийн `/contests/[id]/leaderboard`-ийн tooltip) → нуугдана. Task 2, Task 5.
3. **Цувралд нийтийн бус ангилал, эсвэл нийтийн бус тэмцээний `/live/[id]/all`** → алгасна / 404. Task 2 (`seriesMembers`).
4. **Нэрийн хэлбэр: хоосон зай илүү, нэг үг, «Г.Бат», `null`** → тогтвортой товчлол. Task 2.
5. **Цонхны хил: яг 14 хоногийн дараа эхлэх, яг 3 хоногийн өмнө дууссан** → багтана (≤). Task 2.

---

### Task 1: `contests.is_public` — өгөгдөл, багшийн маягт

**Files:**
- Modify: `src/lib/db/schema.ts` (contests), `src/lib/db/contests.ts` (`Contest`, `toContest`, `upsertContest`), `src/lib/contest-actions.ts` (`saveContest`), `src/components/teacher/contest-form.tsx`
- Modify fixtures: `src/lib/db/contests.test.ts`, `src/lib/db/contest-submissions.test.ts`, `scripts/load-test.ts` (Contest literal бүрт `is_public: false`)
- Create: `drizzle/0009_*.sql` (+ meta) via `npm run db:generate`
- Test: `src/lib/db/contests.test.ts`

**Interfaces:**
- Produces: `Contest.is_public: boolean`; form field `name="is_public"` (checkbox, `"on"`).

- [ ] **Step 1: Failing test** (`contests.test.ts`, `contests`-ийг `@/lib/db/schema`-ээс импортлоно)

```ts
test("is_public defaults to false and round-trips", async () => {
  await getDb().insert(contests).values({ id: "raw-cup", title: "t", starts_at: new Date(0), ends_at: new Date(1) });
  assert.equal((await getContest("raw-cup"))?.is_public, false);
  await upsertContest({ ...contest, is_public: true });
  assert.equal((await getContest(contest.id))?.is_public, true);
});
```

- [ ] **Step 2: Run** `npx tsx --env-file=.env.local --conditions=react-server --test --test-concurrency=1 --test-name-pattern="is_public" src/lib/db/contests.test.ts` — Expected: FAIL (type error / `is_public` undefined).
- [ ] **Step 3:** schema-д `is_public: boolean("is_public").notNull().default(false)` (тайлбар: «Нүүр хуудас ба /live-д харагдана»); `npm run db:generate` → `0009` нь зөвхөн `ADD COLUMN "is_public" boolean DEFAULT false NOT NULL` байхыг уншиж шалгах; `npm run db:migrate` ба `npx tsx --env-file=.env.local scripts/migrate.ts --test`.
- [ ] **Step 4:** `Contest`, `toContest`, `upsertContest` (data object) дээр `is_public`; `saveContest`: `is_public: form.get("is_public") === "on"`; маягтад `requires_approval`-ийн доор ижил загвартай checkbox, `defaultChecked={contest?.is_public ?? false}`, текст «Нийтэд харуулах (нүүр хуудас, шууд leaderboard)». Fixture-ууд `is_public: false`.
- [ ] **Step 5: Run** Step 2-ийн команд → PASS; `npx tsc --noEmit -p .` → 0 алдаа.

### Task 2: Цэвэр функцууд — `src/lib/live-board.ts`

**Files:**
- Create: `src/lib/live-board.ts` (server-only биш, цэвэр — client `Countdown` ч импортлоно), `src/lib/live-board.test.ts`
- Create: `src/lib/contest-status.ts` — `ContestStatus` ба `contestStatus(c: { starts_at: number; ends_at: number }, now = Date.now())`-ийг `contests.ts`-ээс энд зөөнө; `contests.ts` хоёуланг нь re-export хийж одоогийн импортууд хэвээр ажиллана.

**Interfaces:**
- Consumes: `type Contest` (contests.ts — **зөвхөн `import type`**: `contests.ts` нь `server-only` тул runtime импорт client bundle-ийг эвдэнэ), `contestStatus`, `ContestStatus` (contest-status.ts), `groupContests`, `ContestGroup` (contest-division.ts), `scoreTimeline`, `pickRacers`, `raceEnd`, `ScoreEvent` (contest-timeline.ts), `type RaceSeries` (score-race-chart.tsx, `import type`).
- Produces:
  - `UPCOMING_WINDOW_MS = 14 * 86_400_000`, `FINISHED_WINDOW_MS = 3 * 86_400_000`
  - `publicName(name: string | null): string`
  - `formatDuration(ms: number): string` — ≥ 1 өдөр: «N өдөр M цаг»; бусад: «HH:MM:SS»; сөрөг → «00:00:00»
  - `interface HomeBoard { running: ContestGroup<Contest>[]; upcoming: ContestGroup<Contest> | null; finished: ContestGroup<Contest> | null }`
  - `homeBoard(contests: Contest[], now = Date.now()): HomeBoard` — зөвхөн `is_public`; running байвал upcoming/finished = null; үгүй бол хамгийн ойрын upcoming (≤ 14 хоног) ба хамгийн сүүлд дууссан (≤ 3 хоног) тэмцээний **цувралын бүлэг** (нийтийн гишүүдээр)
  - `seriesMembers(contests: Contest[], anchorId: string): Contest[] | null` — anchor байхгүй/нийтийн бус → null; цувралгүй → `[anchor]`; бусад үед ижил `series`-тэй нийтийн тэмцээнүүд, `grade_min`-ээр (null сүүлд)
  - `interface LiveSnapshot { contest: Contest; problems: { id: string; points: number; title: string }[]; participants: LiveRow[]; events: ScoreEvent[] }`, `interface LiveRow { uid: string; name: string | null; class_name: string | null; scores: Record<string, number>; total: number; last_improved_at: number | null }` (эрэмбэлэгдсэн)
  - `interface LiveViewRow { rank: number; name: string; class_name: string | null; scores: Record<string, number>; total: number; last_improved_at: number | null; mine: boolean }`
  - `interface LiveView { status: ContestStatus; problems: { id: string; points: number; title: string | null }[]; rows: LiveViewRow[]; race: RaceSeries[]; maxTotal: number; chartEnd: number }`
  - `liveView(snap: LiveSnapshot, viewer: { uid: string | null }, now = Date.now()): LiveView` — `uid === null` → товчилсон нэр; upcoming үед `title: null`; race = `pickRacers` (эхний 10 + viewer), нэр нь мөрийнхтэй ижил дүрмээр

- [ ] **Step 1: Failing tests** (`T0`, `HOUR`, `DAY` тогтмолууд; `mk(id, starts_at, ends_at, extra?)` нь `is_public: true`, division null-тай Contest үүсгэнэ)

```ts
test("publicName keeps the first word and initials the rest", () => {
  assert.equal(publicName("Бат Болд"), "Бат Б.");
  assert.equal(publicName("Мөнх-Оргил Түвшин Бат"), "Мөнх-Оргил Т. Б.");
  assert.equal(publicName("  Сараа   Дорж "), "Сараа Д.");
  assert.equal(publicName("Г.Бат"), "Г.Бат");
  assert.equal(publicName(""), "Оролцогч");
  assert.equal(publicName(null), "Оролцогч");
});

test("formatDuration", () => {
  assert.equal(formatDuration(2 * DAY + 4 * HOUR + 59 * 60_000), "2 өдөр 4 цаг");
  assert.equal(formatDuration(HOUR + 24 * 60_000 + 37_000), "01:24:37");
  assert.equal(formatDuration(-5), "00:00:00");
});

test("homeBoard: running public contests win; private ones never show", () => {
  const run = mk("run", T0 - HOUR, T0 + HOUR);
  const hidden = mk("hidden", T0 - HOUR, T0 + HOUR, { is_public: false });
  const soon = mk("soon", T0 + DAY, T0 + DAY + HOUR);
  const b = homeBoard([run, hidden, soon], T0);
  assert.deepEqual(b.running.map((g) => g.contests.map((c) => c.id)), [["run"]]);
  assert.equal(b.upcoming, null);
  assert.equal(b.finished, null);
});

test("homeBoard: window edges are inclusive", () => {
  const at14 = mk("at14", T0 + 14 * DAY, T0 + 14 * DAY + HOUR);
  const past3 = mk("past3", T0 - 3 * DAY - HOUR, T0 - 3 * DAY);
  const b = homeBoard([at14, past3], T0);
  assert.equal(b.upcoming?.contests[0].id, "at14");
  assert.equal(b.finished?.contests[0].id, "past3");
  const late = homeBoard([mk("x", T0 + 14 * DAY + 1, T0 + 15 * DAY), mk("y", T0 - 4 * DAY, T0 - 3 * DAY - 1)], T0);
  assert.deepEqual(late, { running: [], upcoming: null, finished: null });
});

test("homeBoard groups a series and drops its private divisions", () => {
  const s = { series: "Намар" };
  const b = homeBoard([
    mk("open", T0 - HOUR, T0 + HOUR, { ...s }),
    mk("jr", T0 - HOUR, T0 + HOUR, { ...s, grade_min: 6, grade_max: 7 }),
    mk("priv", T0 - HOUR, T0 + HOUR, { ...s, grade_min: 8, grade_max: 10, is_public: false }),
  ], T0);
  assert.deepEqual(b.running.map((g) => [g.series, g.contests.map((c) => c.id)]), [["Намар", ["jr", "open"]]]);
});

test("seriesMembers skips private siblings and refuses a private anchor", () => {
  const s = { series: "Намар" };
  const all = [mk("a", T0, T0 + HOUR, { ...s, grade_min: 8, grade_max: 10 }), mk("b", T0, T0 + HOUR, { ...s, grade_min: 6, grade_max: 7 }),
    mk("p", T0, T0 + HOUR, { ...s, is_public: false }), mk("solo", T0, T0 + HOUR)];
  assert.deepEqual(seriesMembers(all, "a")?.map((c) => c.id), ["b", "a"]);
  assert.deepEqual(seriesMembers(all, "solo")?.map((c) => c.id), ["solo"]);
  assert.equal(seriesMembers(all, "p"), null);
  assert.equal(seriesMembers(all, "nope"), null);
});

// snap: problems [{ id: "p1", points: 100, title: "Нийлбэр" }], participants
// u1 «Бат Болд» 7А total 100 (event at T0+HOUR), u2 «Сараа Дорж» 6Б total 0; contest T0 … T0+3h
test("liveView: anonymous viewers get short names and no uids", () => {
  const v = liveView(snap, { uid: null }, T0 + 2 * HOUR);
  assert.deepEqual(v.rows.map((r) => r.name), ["Бат Б.", "Сараа Д."]);
  assert.deepEqual(v.race.map((s) => s.name), ["Бат Б."]);
  const json = JSON.stringify(v);
  assert.equal(json.includes("u1") || json.includes("u2"), false);
  assert.equal(json.includes("Болд") || json.includes("Дорж"), false);
});

test("liveView: signed-in viewers get full names and their own mark", () => {
  const v = liveView(snap, { uid: "u2" }, T0 + 2 * HOUR);
  assert.deepEqual(v.rows.map((r) => [r.name, r.mine]), [["Бат Болд", false], ["Сараа Дорж", true]]);
});

test("liveView hides problem titles before the start", () => {
  assert.equal(liveView(snap, { uid: null }, T0 - 1).problems[0].title, null);
  assert.equal(liveView(snap, { uid: null }, T0 + 1).problems[0].title, "Нийлбэр");
});
```

- [ ] **Step 2: Run** `npx tsx --test src/lib/live-board.test.ts` (react-server condition-гүй — `server-only` орж ирвэл энд унана) — Expected: FAIL (module not found).
- [ ] **Step 3:** `contest-status.ts`-ийг гаргаж `contests.ts`-ээс re-export; `src/lib/live-board.ts`-д дээрх Produces-ыг хэрэгжүүлнэ.
- [ ] **Step 4: Run** Step 2 → бүгд PASS; `npx tsc --noEmit -p .` → 0.

### Task 3: Snapshot уншигч ба кэш

**Files:**
- Create: `src/lib/db/live.ts` (`import "server-only"`), `src/lib/db/live.test.ts`, `src/lib/live-cache.ts` (`import "server-only"`)

**Interfaces:**
- Consumes: `LiveSnapshot`, `LiveRow` (Task 2); `getContest`, `listProblems`, `listParticipants`, `listContests` (contests.ts); `scoreEvents` (contest-submissions.ts).
- Produces:
  - `loadLiveSnapshot(contestId: string): Promise<LiveSnapshot | null>` — тэмцээн байхгүй/`!is_public` → null; participants-аас `email`, `status`, `registered_at` хасна
  - `getLiveSnapshot = unstable_cache(loadLiveSnapshot, ["live-snapshot"], { revalidate: 10 })`
  - `getPublicContests = unstable_cache(async () => (await listContests()).filter((c) => c.is_public), ["public-contests"], { revalidate: 10 })`
  - (`live-cache.ts` нь Next runtime шаарддаг тул unit test-д импортлохгүй)

- [ ] **Step 1: Failing tests** (`live.test.ts`; `beforeEach(resetDb)`, `after(closeDb)`; нээлттэй ангилал, `requires_approval: false`, `is_public: true` fixture)

```ts
test("loadLiveSnapshot is null for unknown and private contests", async () => {
  assert.equal(await loadLiveSnapshot("nope"), null);
  await upsertContest({ ...pub, id: "priv-cup", is_public: false });
  assert.equal(await loadLiveSnapshot("priv-cup"), null);
});

test("loadLiveSnapshot lists approved participants without emails", async () => {
  await upsertContest(pub);
  await addUser("s1", { name: "Бат Болд", class_name: "7А" });
  await registerParticipant(pub.id, { uid: "s1", name: "Бат Болд", email: "s1@shineue.edu.mn" });
  const snap = await loadLiveSnapshot(pub.id);
  assert.equal(snap?.participants[0].name, "Бат Болд");
  assert.equal(JSON.stringify(snap).includes("@shineue.edu.mn"), false);
});
```

- [ ] **Step 2: Run** `npx tsx --env-file=.env.local --conditions=react-server --test --test-concurrency=1 src/lib/db/live.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3:** `live.ts`, `live-cache.ts` хэрэгжүүлнэ.
- [ ] **Step 4: Run** Step 2 → PASS.

### Task 4: `/live` хуудсууд

**Files:**
- Modify: `src/auth.config.ts` (`authorized`: `if (pathname.startsWith("/live")) return true;` — `/verify`-ийн мөрний доор)
- Create: `src/app/live/layout.tsx` (зөвхөн `metadata.robots`), `src/app/live/[contestId]/page.tsx`, `src/app/live/[contestId]/all/page.tsx`
- Create: `src/components/live/auto-refresh.tsx`, `src/components/live/countdown.tsx`, `src/components/live/live-table.tsx`

**Interfaces:**
- Consumes: `getLiveSnapshot`, `getPublicContests` (Task 3); `liveView`, `seriesMembers`, `formatDuration` (Task 2); `ScoreRaceChart`, `ContestStatusBadge`, `formatTime`, `formatWindow`, `divisionLabel`; `auth()`.
- Produces:
  - `AutoRefresh({ until }: { until: number })` — client; 15 000 мс тутам `router.refresh()`, `document.visibilityState === "hidden"` үед алгасаж, харагдах болмогц шууд refresh; `Date.now() > until + 60_000` бол зогсоно; юу ч render хийхгүй
  - `Countdown({ startsAt, endsAt }: { startsAt: number; endsAt: number })` — client; секунд тутам; upcoming → «{formatDuration} дараа эхэлнэ», running → «{formatDuration} үлдсэн», finished → «Дууссан»
  - `LiveTable({ view }: { view: LiveView })` — server; байр (🥇🥈🥉), нэр · анги («Та» тэмдэг `mine` үед), Б1… (`title` байгаа үед л tooltip), нийт, «Цаг»
- Хуудас: `/live/[contestId]` — `seriesMembers(getPublicContests(), id)` null эсвэл snapshot null → `notFound()`; толгой (нэр, «цуврал · ангилал», badge, Countdown, «15 с тутам шинэчлэгдэнэ»), график (`status !== "upcoming"` ба `race.length > 0`), `LiveTable`, цуврал 2+ үед ах дүү ангиллууд ба «Бүгдийг харах» холбоос, `AutoRefresh until={contest.ends_at}`; `lg:` breakpoint-оос график хүснэгтийн хажууд, үсэг томорно.
- Хуудас: `/live/[contestId]/all` — members null → `notFound()`; 1 гишүүнтэй → `redirect(/live/[id])`; гишүүн бүрийн snapshot-ийг `getLiveSnapshot`-оор; багана бүр эхний 10 (байр, нэр · анги, нийт); толгой: цуврал, Countdown (гишүүдийн min `starts_at` / max `ends_at`), `AutoRefresh` (max `ends_at`); `lg:grid-cols-4`, утсанд доош.

- [ ] **Step 1:** Workspace seed script (`.superpowers/sdd/<plan>/live-demo.ts seed|clean`): нийтийн цуврал «Туршилт» (6–7, Сонирхогчид), нийтийн бус 8–10, явж буй цагтай; 3 зөвшөөрөгдсөн сурагч «Бат Болд», «Сараа Дорж», «Тэмүүлэн Ган» оноотой (`applySubmissionScore`).
- [ ] **Step 2:** Хэрэгжүүлнэ; `npx tsc --noEmit -p .` → 0; `npx eslint src` → 0 алдаа.
- [ ] **Step 3: Verify (аккаунтгүй)** `curl -s localhost:3001/live/<6–7 id>` → 200, «Бат Б.» байна, `grep -c "Болд\|@shineue"` → 0; нийтийн бус 8–10 → 404; `/live/<id>/all` → 200, 2 багана.
- [ ] **Step 4: Verify (нэвтэрсэн, браузерийн pane)** бүтэн нэр, «Та» байхгүй (админ оролцоогүй); 15 с-ийн дараа өөр сурагчийн оноог seed-ээр нэмэхэд хуудас өөрчлөгдөнө; утасны өргөн (375px) ба 1920px дэлгэцийн screenshot.

### Task 5: Нүүрний «Тэмцээн» хэсэг ба tooltip засвар

**Files:**
- Create: `src/components/live/home-contests.tsx`
- Modify: `src/app/page.tsx` (зочин: hero ба мэдээний хооронд; нэвтэрсэн: `NavCards`-ийн доор), `src/app/contests/[contestId]/leaderboard/page.tsx` (`title={status === "upcoming" ? undefined : p.title}`)

**Interfaces:**
- Consumes: `homeBoard`, `HomeBoard` (Task 2), `getPublicContests` (Task 3), `Countdown`, `divisionLabel`.
- Produces: `HomeContests({ board }: { board: HomeBoard })` — бүгд хоосон бол `null`; running бүлэг бүрт «● ЯГ ОДОО», нэр (цувралын нэр эсвэл тэмцээний гарчиг), Countdown, ангилал бүр `/live/[id]` холбоос (`divisionLabel`, цувралгүй бол «Харах»), 2+ гишүүнтэй бол «Бүгдийг харах» (`/live/[эхний id]/all`); upcoming → Countdown («… дараа эхэлнэ») + холбоосууд; finished → «Дүн харах» + холбоосууд. Нүүр хуудас `homeBoard(await getPublicContests())` дуудна (`now` нь default параметрээр — компонентод `Date.now()` бичихгүй).

- [ ] **Step 1:** Хэрэгжүүлнэ; tsc 0, eslint 0 алдаа.
- [ ] **Step 2: Verify** `curl -s localhost:3001/` (аккаунтгүй) → «Тэмцээн», «Туршилт», «6–7 анги», «Бүгдийг харах» байна, нийтийн бус ангилал байхгүй; браузерт нэвтэрсэн нүүрэнд мөн харагдана; seed-ийг upcoming (2 өдрийн дараа) болгоход «2 өдөр … дараа эхэлнэ»; 1 өдрийн өмнө дууссан болгоход «Дүн харах».
- [ ] **Step 3: Verify tooltip** upcoming тэмцээний `/contests/<id>/leaderboard` HTML-д бодлогын нэр байхгүй.

### Task 6: Бүтэн шалгалт

- [ ] **Step 1:** `npm test` → бүгд PASS (өмнөх 282 + шинэ); `npx tsc --noEmit -p .` → 0; `npx eslint src scripts` → 0 алдаа; `npx next build` → амжилттай.
- [ ] **Step 2: RSC payload шалгалт** `curl -s -H "RSC: 1" localhost:3001/live/<id>` болон `/live/<id>/all`, `/` → `grep -c "Болд\|Дорж\|@shineue\|s1\b"` → 0.
- [ ] **Step 3:** Demo өгөгдлийг цэвэрлэнэ (`live-demo.ts clean`).
- [ ] **Step 4: Production тэмдэглэл** (тайланд): migration `0009` → deploy → багш 28-ны ангилал бүрт «Нийтэд харуулах» тэмдэглэнэ → `/` ба `/live/...`-г аккаунтгүй хөтчөөр шалгана.
