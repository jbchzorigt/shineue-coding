/**
 * Imports content/modules/*.mdx into the `modules` table (frontmatter →
 * columns, body → lesson_mdx). Safe to re-run — it overwrites module rows
 * with the file contents.
 *
 * Run: npm run script -- scripts/import-content.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { closeDb } from "../src/lib/db/client";
import { upsertModule } from "../src/lib/db/modules";

async function main() {
  const dir = resolve(__dirname, "../content/modules");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
    const { data, content } = matter(readFileSync(join(dir, file), "utf8"));
    const id = data.module_id as string;
    await upsertModule({
      id,
      title: data.title,
      syllabus_ref: data.syllabus_ref ?? "",
      order: data.order,
      description: data.description ?? "",
      lesson_mdx: content.trim(),
    });
    console.log("imported", id, "—", data.title);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
