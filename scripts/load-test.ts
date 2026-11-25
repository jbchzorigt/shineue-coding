/**
 * Contest load test — how grading holds up when many students submit at once.
 *
 *   npm run script -- scripts/load-test.ts piston <pistonBaseUrl> [10,30,60]
 *       N simultaneous "submissions" straight to Piston (local or tunnel URL);
 *       each runs 5 tests one after another, 300 ms apart, like gradePython.
 *   npm run script -- scripts/load-test.ts app <appBaseUrl> [students]
 *       LOCAL ONLY. Full flow through a running `next start`: K test students
 *       log in at the same moment, then all submit at the same moment.
 *       Creates its own contest and users, and deletes them again.
 *   npm run script -- scripts/load-test.ts report
 *       Writes the collected results to docs/superpowers/reports/.
 *
 * Results accumulate in .superpowers/sdd/2026-11-14-contest-divisions/load-results.jsonl.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { eq, like } from "drizzle-orm";
import { closeDb, getDb } from "../src/lib/db/client";
import { contestParticipants, users } from "../src/lib/db/schema";
import { deleteContest, registerParticipant, upsertContest, upsertProblem } from "../src/lib/db/contests";
import { generateTempPassword, hashPassword } from "../src/lib/passwords";
import { isLocalUrl } from "../src/lib/local-only";

const RESULTS = path.join(".superpowers", "sdd", "2026-11-14-contest-divisions", "load-results.jsonl");
const REPORT = path.join("docs", "superpowers", "reports", "2026-11-14-contest-load-test.md");
const TESTS_PER_SUBMISSION = 5;
const RUN_GAP_MS = 300;

/* --------------------------------- code mix -------------------------------- */

type Kind = "simple" | "compute" | "infinite";
// 70% simple, 20% ~1 s of work, 10% never finishes (Piston kills it at 3 s).
const kindOf = (i: number): Kind => (i % 10 < 7 ? "simple" : i % 10 < 9 ? "compute" : "infinite");
const COMPUTE_N = 12_000_000;
const CODE: Record<Kind, string> = {
  simple: "print(sum(map(int, input().split())))",
  compute: `s = 0\nfor i in range(${COMPUTE_N}):\n    s += i\nprint(s % 997)`,
  infinite: "while True:\n    pass",
};
const EXPECTED: Record<Kind, string | null> = {
  simple: "3",
  compute: String(((BigInt(COMPUTE_N) * BigInt(COMPUTE_N - 1)) / BigInt(2)) % BigInt(997)),
  infinite: null,
};

/* --------------------------------- stats ----------------------------------- */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function summary(ms: number[]) {
  const sorted = [...ms].sort((a, b) => a - b);
  return { min: sorted[0] ?? 0, p50: percentile(sorted, 50), p95: percentile(sorted, 95), max: sorted.at(-1) ?? 0 };
}

function record(row: Record<string, unknown>): void {
  mkdirSync(path.dirname(RESULTS), { recursive: true });
  appendFileSync(RESULTS, JSON.stringify({ at: new Date().toISOString(), ...row }) + "\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------- piston mode ------------------------------- */

interface PistonRun {
  ok: boolean;
  timedOut: boolean;
  output: string;
  error?: string;
}

async function pistonExecute(baseUrl: string, code: string, stdin: string): Promise<PistonRun> {
  try {
    const res = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        version: "*",
        files: [{ name: "main.py", content: code }],
        stdin,
        compile_timeout: 10_000,
        run_timeout: 3_000,
      }),
    });
    if (!res.ok) return { ok: false, timedOut: false, output: "", error: `HTTP ${res.status}` };
    const { run } = (await res.json()) as {
      run: { stdout: string; signal: string | null; status?: string | null };
    };
    const timedOut = run.status === "TO" || (run.signal === "SIGKILL" && run.status !== "OL" && !run.stdout);
    return { ok: true, timedOut, output: run.stdout.trim() };
  } catch (err) {
    return { ok: false, timedOut: false, output: "", error: err instanceof Error ? err.message : String(err) };
  }
}

async function pistonSubmission(baseUrl: string, kind: Kind) {
  const started = Date.now();
  let httpErrors = 0;
  let wrong = 0;
  let timeouts = 0;
  for (let t = 0; t < TESTS_PER_SUBMISSION; t++) {
    if (t > 0) await sleep(RUN_GAP_MS);
    const run = await pistonExecute(baseUrl, CODE[kind], "1 2");
    if (!run.ok) httpErrors++;
    else if (run.timedOut) timeouts++;
    else if (EXPECTED[kind] !== null && run.output !== EXPECTED[kind]) wrong++;
  }
  return { kind, ms: Date.now() - started, httpErrors, wrong, timeouts };
}

async function pistonMode(baseUrl: string, levels: number[]): Promise<void> {
  const target = new URL(baseUrl).host;
  console.log(`Piston load test → ${target}`);
  console.log("level  p50(s)  p95(s)  max(s)  slowest∞(s)  httpErr  wrong  timeouts(exp/unexp)");
  for (const n of levels) {
    const results = await Promise.all(Array.from({ length: n }, (_, i) => pistonSubmission(baseUrl, kindOf(i))));
    // Latency counts submissions that can finish; an infinite loop always takes ~5 × 3 s.
    const { p50, p95, max } = summary(results.filter((r) => r.kind !== "infinite").map((r) => r.ms));
    const infiniteMax = summary(results.filter((r) => r.kind === "infinite").map((r) => r.ms)).max;
    const httpErrors = results.reduce((s, r) => s + r.httpErrors, 0);
    const wrong = results.reduce((s, r) => s + r.wrong, 0);
    const expectedTimeouts = results.filter((r) => r.kind === "infinite").reduce((s, r) => s + r.timeouts, 0);
    const unexpectedTimeouts = results.filter((r) => r.kind !== "infinite").reduce((s, r) => s + r.timeouts, 0);
    console.log(
      `${String(n).padStart(5)}  ${(p50 / 1000).toFixed(1).padStart(6)}  ${(p95 / 1000).toFixed(1).padStart(6)}  ${(max / 1000).toFixed(1).padStart(6)}  ${(infiniteMax / 1000).toFixed(1).padStart(11)}  ${String(httpErrors).padStart(7)}  ${String(wrong).padStart(5)}  ${expectedTimeouts}/${unexpectedTimeouts}`
    );
    record({ mode: "piston", target, level: n, p50, p95, max, infiniteMax, httpErrors, wrong, expectedTimeouts, unexpectedTimeouts });
    await sleep(3_000); // let Piston drain between levels
  }
}

/* --------------------------------- app mode -------------------------------- */

const CONTEST = "load-test";
const PROBLEM = "sum";
const POINTS = 100;

class CookieJar {
  private cookies = new Map<string, string>();
  take(res: Response): void {
    for (const line of res.headers.getSetCookie()) {
      const [pair] = line.split(";");
      const eqAt = pair.indexOf("=");
      this.cookies.set(pair.slice(0, eqAt).trim(), pair.slice(eqAt + 1).trim());
    }
  }
  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  has(prefix: string): boolean {
    return [...this.cookies.keys()].some((k) => k.includes(prefix));
  }
}

async function login(baseUrl: string, email: string, password: string): Promise<{ jar: CookieJar; ok: boolean }> {
  const jar = new CookieJar();
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  jar.take(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const res = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: jar.header() },
    body: new URLSearchParams({ email, password, csrfToken, callbackUrl: `${baseUrl}/` }),
  });
  jar.take(res);
  return { jar, ok: jar.has("session-token") };
}

async function setupApp(students: number): Promise<{ email: string; password: string; uid: string }[]> {
  const now = Date.now();
  await upsertContest({
    id: CONTEST,
    title: "Ачааллын тест",
    description: "load test — deleted automatically",
    starts_at: now - 60_000,
    ends_at: now + 3_600_000,
    requires_approval: false,
    series: null,
    grade_min: null,
    grade_max: null,
    is_public: false,
  });
  await upsertProblem(
    CONTEST,
    {
      id: PROBLEM,
      title: "Нийлбэр",
      prompt: "a + b",
      order: 1,
      points: POINTS,
      kind: "python",
      starter_code: "",
      public_test_cases: Array.from({ length: TESTS_PER_SUBMISSION }, () => ({ input: "1 2", expected_output: "3" })),
    },
    { hidden_test_cases: [] }
  );
  const accounts = [];
  for (let i = 1; i <= students; i++) {
    const uid = `load-s${i}`;
    const email = `load-s${i}@shineue.edu.mn`;
    const password = generateTempPassword();
    await getDb()
      .insert(users)
      .values({ uid, email, name: `Load ${i}`, password_hash: await hashPassword(password) });
    await registerParticipant(CONTEST, { uid, name: `Load ${i}`, email });
    accounts.push({ uid, email, password });
  }
  return accounts;
}

async function teardownApp(): Promise<void> {
  await deleteContest(CONTEST);
  await getDb().delete(users).where(like(users.uid, "load-s%"));
}

async function appMode(baseUrl: string, students: number): Promise<void> {
  if (!isLocalUrl(baseUrl)) {
    throw new Error("app mode runs only against a local server (localhost / 127.0.0.1).");
  }
  // Setup and teardown write users straight into DATABASE_URL: never Neon.
  if (!isLocalUrl(process.env.DATABASE_URL)) {
    throw new Error("app mode runs only against a local database (DATABASE_URL on localhost / 127.0.0.1).");
  }
  if (!Number.isInteger(students) || students < 1) {
    throw new Error("students must be a positive integer.");
  }
  console.log(`App load test → ${baseUrl}, ${students} students`);
  await teardownApp(); // leftovers from an interrupted run
  try {
    const accounts = await setupApp(students);

    // Phase 1: everyone logs in at the same moment (scrypt is 128 MiB per check).
    const t0 = Date.now();
    const logins = await Promise.all(
      accounts.map(async (a) => {
        const started = Date.now();
        try {
          const r = await login(baseUrl, a.email, a.password);
          return { ...r, ms: Date.now() - started, error: null as string | null };
        } catch (err) {
          return { jar: new CookieJar(), ok: false, ms: Date.now() - started, error: String(err) };
        }
      })
    );
    const loginStats = summary(logins.map((l) => l.ms));
    const loginFailures = logins.filter((l) => !l.ok).length;
    console.log(
      `logins: ${students - loginFailures}/${students} ok in ${((Date.now() - t0) / 1000).toFixed(1)} s — min ${(loginStats.min / 1000).toFixed(1)} s, p50 ${(loginStats.p50 / 1000).toFixed(1)} s, p95 ${(loginStats.p95 / 1000).toFixed(1)} s, max ${(loginStats.max / 1000).toFixed(1)} s`
    );
    record({ mode: "app-login", level: students, ...loginStats, failures: loginFailures });

    // Phase 2: everyone submits at the same moment.
    const t1 = Date.now();
    const submits = await Promise.all(
      accounts.map(async (a, i) => {
        const kind = kindOf(i);
        const started = Date.now();
        try {
          const res = await fetch(`${baseUrl}/api/contests/${CONTEST}/problems/${PROBLEM}/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: logins[i].jar.header() },
            body: JSON.stringify({ code: CODE[kind] }),
          });
          const body = (await res.json().catch(() => ({}))) as { score?: number };
          return { uid: a.uid, kind, status: res.status, score: body.score, ms: Date.now() - started };
        } catch (err) {
          return { uid: a.uid, kind, status: 0, score: undefined, ms: Date.now() - started, error: String(err) };
        }
      })
    );
    const statuses: Record<string, number> = {};
    for (const s of submits) statuses[s.status] = (statuses[s.status] ?? 0) + 1;
    const submitStats = summary(submits.map((s) => s.ms));
    console.log(
      `submits in ${((Date.now() - t1) / 1000).toFixed(1)} s — statuses ${JSON.stringify(statuses)} — p50 ${(submitStats.p50 / 1000).toFixed(1)} s, p95 ${(submitStats.p95 / 1000).toFixed(1)} s, max ${(submitStats.max / 1000).toFixed(1)} s`
    );

    // Scores: a simple solution earns full points, the others 0; the stored
    // total must match what the API answered.
    const rows = await getDb()
      .select({ uid: contestParticipants.uid, total: contestParticipants.total })
      .from(contestParticipants)
      .where(eq(contestParticipants.contest_id, CONTEST));
    const totals = new Map(rows.map((r) => [r.uid, r.total]));
    const ok200 = submits.filter((s) => s.status === 200);
    const scoreMismatches = ok200.filter(
      (s) => totals.get(s.uid) !== s.score || s.score !== (s.kind === "simple" ? POINTS : 0)
    ).length;
    const alive = (await fetch(`${baseUrl}/login`).catch(() => null))?.status === 200;
    console.log(`score mismatches: ${scoreMismatches}; server alive afterwards: ${alive}`);
    record({ mode: "app-submit", level: students, ...submitStats, statuses, scoreMismatches, alive });
  } finally {
    await teardownApp();
    console.log("test contest and users removed");
  }
}

/* -------------------------------- report mode ------------------------------ */

function reportMode(): void {
  if (!existsSync(RESULTS)) throw new Error(`No results yet (${RESULTS}).`);
  const rows = readFileSync(RESULTS, "utf8").trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
  const s = (ms: unknown) => (Number(ms) / 1000).toFixed(1);
  const piston = rows.filter((r) => r.mode === "piston");
  const logins = rows.filter((r) => r.mode === "app-login");
  const submits = rows.filter((r) => r.mode === "app-submit");
  const lines = [
    "# Тэмцээний ачааллын тест",
    "",
    `Огноо: ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Piston (илгээлт бүр 5 тест, 300 мс зайтай; 70% энгийн, 20% ~1 с, 10% төгсгөлгүй)",
    "",
    "Хугацаа нь дуусах боломжтой илгээлтүүдийнх; төгсгөлгүй давталт үргэлж ~5 × 3 с үргэлжилдэг тул тусад нь.",
    "",
    "| Хаана | Зэрэг | p50 (с) | p95 (с) | max (с) | Төгсгөлгүйн max (с) | HTTP алдаа | Буруу | Timeout (хүлээгдсэн/гэнэтийн) |",
    "|---|---|---|---|---|---|---|---|---|",
    ...piston.map(
      (r) =>
        `| ${r.target} | ${r.level} | ${s(r.p50)} | ${s(r.p95)} | ${s(r.max)} | ${s(r.infiniteMax)} | ${r.httpErrors} | ${r.wrong} | ${r.expectedTimeouts}/${r.unexpectedTimeouts} |`
    ),
    "",
    "## Сайтын бүтэн урсгал (local `next start`)",
    "",
    "| Үе шат | Сурагч | p50 (с) | p95 (с) | max (с) | Үр дүн |",
    "|---|---|---|---|---|---|",
    ...logins.map((r) => `| Зэрэг нэвтрэх | ${r.level} | ${s(r.p50)} | ${s(r.p95)} | ${s(r.max)} | ${r.failures} амжилтгүй |`),
    ...submits.map(
      (r) =>
        `| Зэрэг илгээх | ${r.level} | ${s(r.p50)} | ${s(r.p95)} | ${s(r.max)} | статус ${JSON.stringify(r.statuses)}, оноо зөрсөн ${r.scoreMismatches}, сервер ${r.alive ? "ажиллаж байна" : "УНАСАН"} |`
    ),
    "",
  ];
  mkdirSync(path.dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, lines.join("\n"));
  console.log(`wrote ${REPORT}`);
}

/* ---------------------------------- main ----------------------------------- */

async function main() {
  const [mode, arg, extra] = process.argv.slice(2);
  if (mode === "piston" && arg) {
    const levels = (extra ?? "10,30,60,100,150").split(",").map(Number).filter((n) => n > 0);
    await pistonMode(arg.replace(/\/$/, ""), levels);
  } else if (mode === "app" && arg) {
    await appMode(arg.replace(/\/$/, ""), Number(extra ?? 60));
  } else if (mode === "report") {
    reportMode();
  } else {
    console.log("usage: load-test.ts piston <url> [levels] | app <url> [students] | report");
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());

