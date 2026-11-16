# Contest Divisions and Load Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contests can belong to a named series and be limited to a grade range (6–7, 8–10, 11–12, or open "Сонирхогчид"). Registration enforces the range; teachers can copy problems between contests. A load test measures whether grading survives concurrent submissions and logins.

**Architecture:**
- Each division is an ordinary contest with three new nullable columns (`series`, `grade_min`, `grade_max`). Scoring, leaderboards, charts and approvals are untouched.
- Pure rules live in `src/lib/contest-division.ts`. `registerParticipant` enforces eligibility inside its transaction. Pages group contests by series.
- `scripts/load-test.ts` drives Piston directly or through the tunnel, and drives the local full submit flow. It writes a report.

**Tech Stack:** Next.js 16.2 App Router (read `node_modules/next/dist/docs/` before touching Next APIs), React 19, Drizzle 0.45 + Postgres, `node:test` via tsx, NextAuth credentials.

**Spec:** `docs/superpowers/specs/2026-11-14-contest-divisions-design.md`

## Global Constraints

**Workflow and safety**
- No commits or pushes. The user commits on "final code". Record progress in the ledger.
- Never touch the `shineue-db` container or port 5432. Never print `.env.local` values.
- Run DB tests one file at a time. Before single-file DB runs after a schema change, run `npx tsx --env-file=.env.local scripts/migrate.ts --test`.
- Load test safety:
  - Local only, against the local DB and local Piston.
  - The tunnel run needs the user's go-ahead.
  - Never load the production Vercel/Neon.

**Language and copy**
- UI text is Mongolian; code, identifiers and comments are English.
- Exact strings:
  - Division labels: «6–7 анги» (en dash), «9-р анги» when min = max, «Сонирхогчид».
  - Ineligible registration error: «Таны анги (N) энэ ангилалд хамаарахгүй.»
  - Ineligible list/page text: «Таны ангид хамаарахгүй».
  - Unknown-class note: «Багш таны ангийг шалгаж зөвшөөрнө».
  - Range validation: «Ангийн хязгаар 1–12, доод нь дээдээсээ их биш байх ёстой.»
  - Copy collision: «Тэр тэмцээнд «<id>» ID-тэй бодлого аль хэдийн байна.»
  - Copy note: «Хуулбар бие даасан — нэгийг засахад нөгөө өөрчлөгдөхгүй».

**Data**
- `contests.series` text null; `grade_min`, `grade_max` integer null.
- Check `contests_grade_range_check`: `(grade_min is null and grade_max is null) or (grade_min between 1 and 12 and grade_max between grade_min and 12)`.

**Load test**
- Levels 10, 30, 60, 100, 150.
- Code mix: 70% simple correct, 20% ~1 s compute, 10% infinite loop.
- Each submission runs T tests sequentially with a 300 ms gap.
- Pass criteria: 0 errors, timeouts only from the infinite loops, p95 < 20 s, max < 50 s.

## Review Focus

1. **Forged POST to `registerForContest` for an out-of-range division.** No participant row may be created. Test: `registerParticipant` on a 6–7 contest for an 11B student throws `UserError` and leaves 0 rows (Task 2).
2. **A student with no class, or "A7", registers for a ranged contest whose `requires_approval` is false.** The row must still be pending, never approved. Test: `requires_approval=false` + unknown class → `"pending"` (Task 2).
3. **Copying a problem whose id already exists in the target contest.** The copy must refuse, and neither contest's problem may change. Test: the collision throws `UserError`, the target keeps its original title and hidden tests, and the source is unchanged (Task 2).
4. **A teacher saves "from 8 to 6", 0, 13, or one bound blank.** The save must be refused with the exact message, and nothing stored. Tests: `parseDivisionForm` unit cases (Task 1) and the DB check constraint rejecting `{8, 6}` (Task 2).
5. **Many students log in at the same moment when the contest starts.** scrypt costs 128 MiB per hash, so a burst of logins can exhaust memory. Measure with the load test's concurrent-login phase and report it (Task 5).

---

### Task 1: Division rules (pure)

**Files:**
- Create: `src/lib/contest-division.ts`
- Test: `src/lib/contest-division.test.ts`

**Interfaces — Produces:**
- `export interface DivisionFields { series: string | null; grade_min: number | null; grade_max: number | null }`
- `export function gradeOf(className: string | null): number | null`. Returns the leading integer of the class name when it is 1–12; otherwise `null`.
- `export type Eligibility = { kind: "open" } | { kind: "eligible" } | { kind: "unknown" } | { kind: "ineligible"; grade: number }`
- `export function divisionEligibility(contest: Pick<DivisionFields, "grade_min" | "grade_max">, className: string | null): Eligibility`
- `export function divisionLabel(contest: Pick<DivisionFields, "grade_min" | "grade_max">): string`
- `export interface ContestGroup<T> { series: string | null; contests: T[] }`
- `export function groupContests<T extends DivisionFields>(contests: T[]): ContestGroup<T>[]`. The input is already newest-first.
  - A series-less contest becomes its own group.
  - Contests sharing a series form one group, placed where that series first appears.
  - Within a group, sort by `grade_min` ascending, with `null` last.
- `export function parseDivisionForm(series: string, mode: string, min: string, max: string): { ok: true; value: DivisionFields } | { ok: false; error: string }`
  - `mode` is `"open"` or `"range"`.
  - Trim `series`; blank becomes `null`.
  - `"open"` gives null bounds.
  - `"range"` needs integers with 1 ≤ min ≤ max ≤ 12. Otherwise return the exact range error.

- [ ] **Step 1: Write the tests**
  - `gradeOf`: "7A"→7, "11B"→11, "6"→6, "A7"→null, "13A"→null, "0A"→null, null→null.
  - `divisionEligibility`:
    - `{null, null}` with "7A" → `{kind: "open"}`, and with null → `{kind: "open"}`;
    - `{6, 7}` with "7A" → `{kind: "eligible"}`;
    - `{6, 7}` with "11B" → `{kind: "ineligible", grade: 11}`;
    - `{6, 7}` with null → `{kind: "unknown"}`, and with "A7" → `{kind: "unknown"}`.
  - `divisionLabel`: `{6, 7}` → "6–7 анги"; `{9, 9}` → "9-р анги"; `{null, null}` → "Сонирхогчид".
  - `groupContests`:
    - Input, newest first: `[x(series S, 11–12), y(no series), z(series S, open), w(series S, 6–7)]`.
    - Expect `[{series: "S", contests: [w, x, z]}, {series: null, contests: [y]}]`.
  - `parseDivisionForm`:
    - `("  Намар ", "range", "6", "7")` → `{series: "Намар", grade_min: 6, grade_max: 7}`.
    - `("", "open", "", "")` → series null, bounds null.
    - `("x", "range", "8", "6")`, `("x", "range", "0", "3")`, `("x", "range", "5", "13")` and `("x", "range", "", "7")` → `ok: false` with the exact range error.
- [ ] **Step 2:** `npx tsx --conditions=react-server --test src/lib/contest-division.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement the interfaces.
- [ ] **Step 4:** Re-run. Expected: PASS.
- [ ] **Step 5:** Ledger line. No commit.

---

### Task 2: Schema, migration, registration rule, problem copy

**Files:**
- Modify: `src/lib/db/schema.ts` (`contests`)
- Generate: `drizzle/0007_*.sql` with `npm run db:generate`. Check that the SQL has the 3 columns and the check, then run `npm run db:migrate` and the test-DB migrate.
- Modify: `src/lib/db/contests.ts`
- Modify: `src/lib/contest-actions.ts`. `saveContest` passes `series: null, grade_min: null, grade_max: null` until Task 4, so the code compiles.
- Fix fixtures that build `Contest` objects so they compile: `contests.test.ts`, `contest-submissions.test.ts`, and any others tsc lists.
- Test: `src/lib/db/contests.test.ts`

**Interfaces:**
- **Consumes:** `DivisionFields`, `divisionEligibility` (Task 1).
- **Produces:**
  - `Contest` gains `series: string | null; grade_min: number | null; grade_max: number | null`. Round-trip them through `toContest` and `upsertContest`.
  - `registerParticipant` reads the user's `class_name` in the same transaction, then:
    - `ineligible` → throw `UserError("Таны анги (N) энэ ангилалд хамаарахгүй.")` and insert nothing;
    - `unknown` → insert `pending`;
    - `open` or `eligible` → follow today's `requires_approval` rule.
  - `export async function copyProblem(fromContestId: string, problemId: string, toContestId: string): Promise<void>`:
    - copy the public and private parts with the same id and order;
    - if the target already has that id, throw `UserError` with the collision text;
    - if the source is missing, throw `NotFoundError("Бодлого олдсонгүй.")`;
    - if the target contest is missing, throw `UserError("Тэмцээн олдсонгүй: <id>")`.

- [ ] **Step 1: Write the tests** (contests.test.ts). Existing fixtures get `series: null, grade_min: null, grade_max: null`.
  - `division fields round-trip`: upsert `{series: "Намар", grade_min: 6, grade_max: 7}` → `getContest` returns the same values.
  - `the database refuses a reversed grade range`: upserting `{grade_min: 8, grade_max: 6}` rejects.
  - `an out-of-range student cannot register`: on a 6–7 contest, an "11B" user gets a rejection with a `UserError` whose message is «Таны анги (11) энэ ангилалд хамаарахгүй.», and the contest has 0 participant rows.
  - `an in-range student follows the approval setting`: a "7A" user on a 6–7 contest with `requires_approval: false` → `"approved"`.
  - `an unknown class always waits for a teacher`: a classless user, and an "A7" user, on a 6–7 contest with `requires_approval: false` → `"pending"`.
  - `the open division takes any grade`: an "11B" user on an open contest → follows `requires_approval`.
  - `copyProblem copies public and private parts`:
    - copy `p1` with hidden tests from contest A to contest B;
    - `getProblem` and `getProblemPrivate` on B equal A's.
  - `copyProblem refuses an id that exists in the target`:
    - B already has `p1` titled «Өөр»;
    - copying rejects with the collision message;
    - B's `p1` title and hidden tests are unchanged, and A is unchanged.
- [ ] **Step 2:** Run it (after the test-DB migrate). Expected: FAIL (missing columns / `copyProblem` is not a function).
- [ ] **Step 3:** Change the schema, generate and migrate (dev + test), then implement the interfaces.
- [ ] **Step 4:** Run `contests.test.ts` and `contest-submissions.test.ts`, then `npx tsc --noEmit`. Expected: PASS and 0 errors.
- [ ] **Step 5:** Ledger line.

---

### Task 3: Student-facing pages

**Files:**
- Modify: `src/app/contests/page.tsx`
- Modify: `src/app/contests/[contestId]/page.tsx`
- Modify: `src/app/contests/[contestId]/leaderboard/page.tsx` (add the division label to the header)
- Modify: `src/lib/contest-actions.ts` (`registerForContest` catches `UserError` and redirects to the contest page)

**Interfaces — Consumes:** `groupContests`, `divisionEligibility`, `divisionLabel`, `gradeOf` (Task 1); `Contest` division fields (Task 2); the user's `class_name` via `getUserProfile`.

- [ ] **Step 1: `/contests`.** Render `groupContests(contests)`.
  - A group with a series is one card. The heading is the series name. It has one row per contest showing the division label (linking to the contest), time window, status badge, participant count, and the existing «Оролцох» or status badge.
  - When `divisionEligibility(...)` is `ineligible` and the student has no row, show muted «Таны ангид хамаарахгүй» instead of «Оролцох».
  - A group without a series keeps today's card.
  - Staff see the same list, without the ineligible text.
- [ ] **Step 2: Contest page.**
  - Under the title, show «<series> · <label>», or just the label when there is no series. Show it only when the contest has a series or a grade range.
  - In the no-row card:
    - `ineligible` → show «Таны ангид хамаарахгүй» and no button;
    - `unknown` with a range → keep «Оролцох», with «Багш таны ангийг шалгаж зөвшөөрнө» under it.
- [ ] **Step 3: Leaderboard.** Show the label next to the title.
- [ ] **Step 4: `registerForContest`.** Add `if (err instanceof UserError) redirect(\`/contests/${contestId}\`)` beside the existing `NotFoundError` branch.
- [ ] **Step 5:** Run `npx tsc --noEmit` and `npx eslint src`. Expected: 0 errors. Ledger line.

---

### Task 4: Teacher pages and problem copy

**Files:**
- Modify: `src/components/teacher/contest-form.tsx`
- Modify: `src/lib/contest-actions.ts` (`saveContest`, new `copyContestProblem`)
- Modify: `src/app/teacher/contests/page.tsx` (group by series)
- Modify: `src/app/teacher/contests/[contestId]/page.tsx` (pass the existing series names for the datalist)
- Create: `src/components/teacher/copy-problem-form.tsx` (client, `useActionState`)
- Modify: `src/app/teacher/contests/[contestId]/problems/[problemId]/page.tsx` (render the copy form for existing problems)

**Interfaces:**
- **Consumes:** `parseDivisionForm`, `groupContests`, `divisionLabel` (Task 1); `copyProblem`, `listContests` (Task 2).
- **Produces:**
  - `copyContestProblem(fromContestId: string, problemId: string, _prev: ActionState, form: FormData): Promise<ActionState>`:
    - `requireStaff`;
    - `to = form.get("to")`, validated with `ID_RE`;
    - call `copyProblem`; on error return `{ error: userMessage(err) }`;
    - on success, `revalidatePath(\`/teacher/contests/${to}\`)` and redirect to `/teacher/contests/${to}`.
  - `ContestForm({ contest, seriesOptions }: { contest: Contest | null; seriesOptions: string[] })`.

- [ ] **Step 1: Form fields.**
  - «Цуврал»: `<input name="series" list="series-options">` with a datalist of `seriesOptions`.
  - «Ангилал»: radio `division_mode` = `open` («Бүх анги (сонирхогчид)») or `range` («Ангиас … хүртэл»), with number inputs `grade_min` and `grade_max` (min 1, max 12) that are enabled only for `range`.
  - Defaults come from `contest`.
- [ ] **Step 2: `saveContest`.** Run `parseDivisionForm` on the four fields. If it fails, return its error. Otherwise pass the values to `upsertContest`.
- [ ] **Step 3: Teacher list.** Group by series the same way as `/contests`: a series card with rows, each row showing the label and the existing badges and buttons.
- [ ] **Step 4: Copy form.**
  - Show it on the problem edit page when the problem is not new.
  - A `<select name="to">` lists every other contest, same series first, each shown as «<title> (<label>)».
  - A «Хуулах» button.
  - The copy note text.
  - Any error shown inline.
- [ ] **Step 5: Full check.**
  - `npm test`: expect all pass, and report the count.
  - `npx tsc --noEmit`: 0 errors.
  - `npx eslint src scripts`: 0 errors.
  - `npx next build`: ok.
- [ ] **Step 6: Browser check (controller, staff session on localhost:3001).**
  - Create the series «Туршилт» with divisions 6–7, 8–10 and open.
  - Check that `/contests` shows one series card ordered 6–7, 8–10, Сонирхогчид.
  - Copy a problem from 6–7 to 8–10. The redirect lands on 8–10, and the problem is listed there.
  - Copy it again. The collision message appears.
  - Check that saving 8 → 6 shows the range error.
  - Remove the test contests afterwards.
  - Ledger line.

---

### Task 5: Load test

**Files:**
- Create: `scripts/load-test.ts`
- Create: `docs/superpowers/reports/2026-11-14-contest-load-test.md` (written by the script's `report` step; edit it by hand to add the analysis)

**Interfaces — Produces:** CLI `npm run script -- scripts/load-test.ts <mode> [args]`.

- **`piston <baseUrl> [levels]`**
  - For each level N (default `10,30,60,100,150`), start N submissions at once.
  - Each submission runs T=5 tests sequentially with a 300 ms gap, posting to `<baseUrl>/execute` with Python.
  - The code mix is deterministic by index:
    - 70%: `print(sum(map(int, input().split())))` with input `"1 2"` → expect `3`;
    - 20%: a ~1 s loop that prints a fixed number;
    - 10%: `while True: pass`, where Piston's 3 s timeout is expected.
  - Record per submission: total ms, HTTP or network errors, wrong outputs, and timeouts (`status === "TO"`, or SIGKILL with no output).
  - Print a table per level with p50, p95, max, errors, wrong and timeouts.
  - Append a JSON line per level to `.superpowers/sdd/2026-11-14-contest-divisions/load-results.jsonl`.
- **`app <baseUrl> [students]`** (local only; refuse unless the base URL host is `localhost` or `127.0.0.1`)
  - **Setup through the DB layer:**
    - create a running contest `load-test`, open division, `requires_approval: false`, with one Python problem (5 public + 0 hidden tests);
    - create K users (default 60) `load-sN@shineue.edu.mn`, each with a random password made by `generateTempPassword()` and stored with `hashPassword`;
    - register them.
  - **Phase 1, concurrent logins:**
    - for each user, get `/api/auth/csrf`, then post `email`, `password` and `csrfToken` to `/api/auth/callback/credentials`, all K at once;
    - keep the session cookie;
    - record the time, failures and process health (`/login` still returns 200 afterwards).
  - **Phase 2, concurrent submissions:**
    - all K post to `/api/contests/load-test/problems/<pid>/submit` at once with the mixed code;
    - record the HTTP status counts (200, 429, 5xx) and the time.
    - then check from the DB that each participant's `total` equals their best score.
  - **Teardown:** `deleteContest("load-test")` and delete the `load-s*` users, in a `finally` block.
  - Append JSON lines to the same results file.
- **`report`** — render the results file as markdown tables in the report path, with the run date.

- [ ] **Step 1:** Write the script. Run `piston http://localhost:2000/api/v2 10` as a smoke test. Expected: a table with 0 errors.
- [ ] **Step 2:** Run the full local Piston levels.
- [ ] **Step 3:** Build and start the app locally: `npx next build`, then a `next start -p 3002` launch config via `preview_start`. Run `app http://localhost:3002 60`, then 100 or 150 if 60 passes.
- [ ] **Step 4: Tunnel run.**
  - Ask the user for the go-ahead first, because it shares the production grader.
  - Then run `piston <tunnel URL>/api/v2` at levels 10, 30 and 60. Take the tunnel URL from `data/cloudflared.log`.
  - If the user declines, record that in the report.
- [ ] **Step 5: Report.**
  - Run `report`.
  - Add an analysis section in Mongolian: where each path started failing; memory or CPU observations (Task Manager / `docker stats` snapshot); a comparison against the pass criteria; recommendations.
  - Recommendations to evaluate include Piston job concurrency settings, running a submission's tests in parallel, a named Cloudflare tunnel, the scrypt login cost under a burst, and the 429 cooldown.
  - Do not apply fixes; the user decides.
  - Ledger line.
