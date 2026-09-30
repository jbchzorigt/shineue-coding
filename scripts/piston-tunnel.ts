/**
 * Opens a Cloudflare quick tunnel to the local Piston, points the Vercel
 * production PISTON_URL at it and redeploys. Run after every reboot:
 *   npm.cmd run script -- scripts/piston-tunnel.ts
 * Needs: Docker (coding-piston), cloudflared, and a logged-in, linked Vercel CLI.
 */
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, openSync, readFileSync } from "node:fs";
import path from "node:path";

const PISTON = "http://localhost:2000";
const LOG = path.join(process.cwd(), "data", "cloudflared.log");
const WIN = process.platform === "win32";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Node refuses to spawn .cmd files without a shell; the arguments here are constants. */
function vercel(args: string[], input?: string) {
  execFileSync(WIN ? "vercel.cmd" : "vercel", args, {
    shell: WIN,
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "inherit", "inherit"],
  });
}

async function pistonReady(): Promise<boolean> {
  try {
    const res = await fetch(`${PISTON}/api/v2/runtimes`);
    return res.ok && (await res.text()).includes("python");
  } catch {
    return false;
  }
}

async function main() {
  console.log("1/5 Локал Piston шалгаж байна…");
  if (!(await pistonReady())) {
    execFileSync("docker", ["start", "coding-piston"], { stdio: "inherit" });
    for (let i = 0; i < 60 && !(await pistonReady()); i++) await sleep(2000);
    if (!(await pistonReady())) throw new Error("Piston асахгүй байна. `npm.cmd run db:up`-ийг шалгана уу.");
  }

  console.log("2/5 Хуучин tunnel-ийг зогсоож байна…");
  try {
    execFileSync(WIN ? "taskkill" : "pkill", WIN ? ["/IM", "cloudflared.exe", "/F"] : ["-f", "cloudflared tunnel"], {
      stdio: "ignore",
    });
  } catch {
    // none was running
  }

  console.log("3/5 Шинэ tunnel асааж байна…");
  mkdirSync(path.dirname(LOG), { recursive: true });
  const out = openSync(LOG, "w");
  spawn("cloudflared", ["tunnel", "--url", PISTON], {
    detached: true,
    stdio: ["ignore", out, out],
    windowsHide: true,
  }).unref();
  let url: string | undefined;
  for (let i = 0; i < 60 && !url; i++) {
    await sleep(1000);
    url = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(readFileSync(LOG, "utf8"))?.[0];
  }
  if (!url) throw new Error(`Tunnel-ийн хаяг гарсангүй. ${LOG}-ийг шалгана уу.`);
  console.log(`    ${url}`);

  console.log("4/5 Vercel-ийн PISTON_URL-ийг шинэчилж байна…");
  try {
    vercel(["env", "rm", "PISTON_URL", "production", "--yes"]);
  } catch {
    // not set yet
  }
  vercel(["env", "add", "PISTON_URL", "production"], `${url}/api/v2`);

  console.log("5/5 Production deploy хийж байна (1–3 минут)…");
  vercel(["deploy", "--prod", "--yes"]);
  console.log("Дууслаа. Сайт дээр Python бодлого илгээж шалгаарай.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
