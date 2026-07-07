import "server-only";

const PISTON_URL = process.env.PISTON_URL ?? "https://emkc.org/api/v2/piston";

/** Optional shared secret when Piston sits behind a reverse proxy. */
function pistonHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...(process.env.PISTON_API_KEY ? { "X-Api-Key": process.env.PISTON_API_KEY } : {}),
  };
}

/** Delay between runs — the public emkc instance allows ~5 req/s. */
const RUN_GAP_MS = 300;

interface PistonRunResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
}

export interface ExecutionResult {
  /** Normalized stdout. */
  output: string;
  /** Human-readable error when the run failed (runtime error / timeout). */
  error: string | null;
}

let cachedPythonVersion: string | null = null;

async function getPythonVersion(): Promise<string> {
  if (cachedPythonVersion) return cachedPythonVersion;
  const res = await fetch(`${PISTON_URL}/runtimes`, { headers: pistonHeaders() });
  if (!res.ok) throw new Error(`Piston runtimes request failed: ${res.status}`);
  const runtimes: { language: string; version: string }[] = await res.json();
  const python = runtimes.find((r) => r.language === "python");
  if (!python) throw new Error("Piston has no python runtime");
  cachedPythonVersion = python.version;
  return python.version;
}

/**
 * Trailing whitespace per line and trailing newlines never count as a
 * difference — exact-match grading without this drowns students in
 * false failures.
 */
export function normalizeOutput(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n+$/, "");
}

export async function executePython(
  code: string,
  stdin: string
): Promise<ExecutionResult> {
  const version = await getPythonVersion();
  const res = await fetch(`${PISTON_URL}/execute`, {
    method: "POST",
    headers: pistonHeaders(),
    body: JSON.stringify({
      language: "python",
      version,
      files: [{ name: "main.py", content: code }],
      stdin,
      compile_timeout: 10_000,
      // Piston's default configured maximum.
      run_timeout: 3_000,
    }),
  });
  if (!res.ok) {
    throw new Error(`Piston execute failed: ${res.status} ${await res.text()}`);
  }

  const data: { run: PistonRunResult } = await res.json();
  const { run } = data;

  if (run.signal === "SIGKILL") {
    return { output: "", error: "Хугацаа хэтэрлээ (3с) — код гацсан байж магадгүй (жишээ нь төгсгөлгүй давталт)." };
  }
  if (run.code !== 0) {
    // Keep the tail of stderr — Python puts the actual error last.
    const tail = run.stderr.trim().split("\n").slice(-5).join("\n");
    return { output: normalizeOutput(run.stdout), error: tail || "Runtime error" };
  }
  return { output: normalizeOutput(run.stdout), error: null };
}

export interface GradedTest {
  passed: boolean;
  actual: string;
  error: string | null;
}

/** Runs test cases sequentially (public Piston instance is rate-limited). */
export async function gradePython(
  code: string,
  tests: { input: string; expected_output: string }[]
): Promise<GradedTest[]> {
  const results: GradedTest[] = [];
  for (let i = 0; i < tests.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, RUN_GAP_MS));
    const test = tests[i];
    const run = await executePython(code, test.input);
    results.push({
      passed: run.error === null && run.output === normalizeOutput(test.expected_output),
      actual: run.error ?? run.output,
      error: run.error,
    });
  }
  return results;
}
