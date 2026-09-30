/**
 * Proves IB DP answers on the real grader (Piston, PISTON_URL):
 * - coding: the reference `solution` must pass every public and hidden test;
 * - tracing: the prompt's ```python block must print exactly `expected`.
 * Run: npm run script -- scripts/check-solutions.ts [module-id …]
 */
import { checkChallengeFile, pythonBlocks, type ChallengeFile } from "../src/lib/content/ibdp";
import { loadIbdpContent } from "../src/lib/content/ibdp-files";
import { executePython, gradePython, normalizeOutput } from "../src/lib/piston";

const problems: string[] = [];
let checked = 0;

async function main() {
  const only = new Set(process.argv.slice(2));

  for (const m of loadIbdpContent()) {
    if (only.size > 0 && !only.has(m.module.id)) continue;
    const fileProblems = checkChallengeFile(m.challenges, m.module);
    if (fileProblems.length > 0) {
      problems.push(...fileProblems.map((p) => `${m.module.id}: ${p}`));
      continue;
    }
    for (const c of (m.challenges as ChallengeFile).challenges) {
      if (c.type === "coding") {
        const cases = [...c.tests, ...c.hidden_tests].map((t) => ({ input: t.input, expected_output: t.output }));
        try {
          const results = await gradePython(c.solution, cases);
          results.forEach((r, i) => {
            if (!r.passed) {
              problems.push(`${c.id} test ${i + 1}: expected ${JSON.stringify(normalizeOutput(cases[i].expected_output))}, got ${JSON.stringify(r.actual)}`);
            }
          });
        } catch (err) {
          throw new Error(`${c.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
        checked++;
      } else if (c.type === "tracing") {
        const [code] = pythonBlocks(c.prompt);
        if (!code) continue; // a tracing question without a program
        try {
          const run = await executePython(code, "");
          const want = normalizeOutput(c.expected);
          if (run.error !== null || run.output !== want) {
            problems.push(`${c.id}: expected ${JSON.stringify(want)}, got ${JSON.stringify(run.error ?? run.output)}`);
          }
        } catch (err) {
          throw new Error(`${c.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
        checked++;
      }
    }
  }

  console.log(`checked ${checked} challenges, ${problems.length} problems`);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.log(`checked ${checked} challenges, ${problems.length} problems`);
  if (problems.length > 0) {
    console.error(problems.join("\n"));
  }
  console.error(`check-solutions stopped: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
