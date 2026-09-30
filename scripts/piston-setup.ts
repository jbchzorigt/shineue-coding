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
