/**
 * One-off: imports content/modules/*.mdx into the Firestore `modules`
 * collection (frontmatter → fields, body → lesson_mdx). Safe to re-run —
 * it overwrites module docs with the file contents.
 *
 * Run: NODE_OPTIONS="--conditions=react-server" npx tsx scripts/import-content.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import matter from "gray-matter";

async function main() {
  for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="(.*)"$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }

  const { getDb } = await import("../src/lib/firebase/admin");
  const db = getDb();

  const dir = resolve(__dirname, "../content/modules");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(readFileSync(join(dir, file), "utf8"));
    const id = data.module_id as string;
    await db.collection("modules").doc(id).set({
      title: data.title,
      syllabus_ref: data.syllabus_ref ?? "",
      order: data.order,
      description: data.description ?? "",
      lesson_mdx: content.trim(),
    });
    console.log("imported", id, "—", data.title);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
