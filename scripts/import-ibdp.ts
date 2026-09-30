/**
 * Imports the IB DP modules (content/modules/<id>.mdx + content/challenges/<id>.json)
 * — only those 19, never modules 01–07. Safe to re-run.
 * Local:      npm run script -- scripts/import-ibdp.ts
 * Production: npm.cmd run script:prod -- scripts/import-ibdp.ts   (after deploying)
 */
import { closeDb } from "../src/lib/db/client";
import { loadIbdpContent } from "../src/lib/content/ibdp-files";
import { importIbdp } from "../src/lib/content/ibdp-import";

async function main() {
  const loaded = loadIbdpContent();
  const r = await importIbdp(loaded);
  console.log(`imported ${r.modules} modules, ${r.challenges} challenges: ${loaded.map((m) => m.module.id).join(", ")}`);
  if (r.stale.length > 0) {
    console.warn(`challenges in the database but not in the files (left as they are): ${r.stale.join(", ")}`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
