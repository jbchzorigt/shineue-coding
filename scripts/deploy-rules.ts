/**
 * Deploys firestore.rules to the project via the Firebase Rules REST API.
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/deploy-rules.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const project = process.env.FIREBASE_PROJECT_ID!;
  const rules = readFileSync(resolve(__dirname, "../firestore.rules"), "utf8");

  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL!,
      private_key: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase"],
  });
  const token = (await (await auth.getClient()).getAccessToken()).token;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `https://firebaserules.googleapis.com/v1/projects/${project}`;

  // 1. Create a ruleset from the local file.
  const rulesetRes = await fetch(`${base}/rulesets`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: { files: [{ name: "firestore.rules", content: rules }] },
    }),
  });
  if (!rulesetRes.ok) {
    console.error("ruleset create failed:", rulesetRes.status, await rulesetRes.text());
    process.exit(1);
  }
  const rulesetName = ((await rulesetRes.json()) as { name: string }).name;
  console.log("ruleset created:", rulesetName);

  // 2. Point the cloud.firestore release at it (update, or create on first deploy).
  const releaseName = `projects/${project}/releases/cloud.firestore`;
  const patch = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ release: { name: releaseName, rulesetName } }),
  });
  if (patch.ok) {
    console.log("release updated — deny-all rules are live.");
    return;
  }
  if (patch.status === 404) {
    const create = await fetch(`${base}/releases`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: releaseName, rulesetName }),
    });
    if (!create.ok) {
      console.error("release create failed:", create.status, await create.text());
      process.exit(1);
    }
    console.log("release created — deny-all rules are live.");
    return;
  }
  console.error("release update failed:", patch.status, await patch.text());
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
