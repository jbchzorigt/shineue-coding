import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content", "modules");

export interface LessonMeta {
  module_id: string;
  syllabus_ref: string;
  title: string;
  order: number;
  description: string;
}

export interface Lesson {
  meta: LessonMeta;
  /** Raw MDX body (frontmatter stripped). */
  content: string;
}

function parseLesson(filePath: string): Lesson {
  const { data, content } = matter(readFileSync(filePath, "utf8"));
  const meta = data as Partial<LessonMeta>;
  if (!meta.module_id || !meta.title || typeof meta.order !== "number") {
    throw new Error(`Invalid lesson frontmatter in ${filePath}`);
  }
  return {
    meta: {
      module_id: meta.module_id,
      syllabus_ref: meta.syllabus_ref ?? "",
      title: meta.title,
      order: meta.order,
      description: meta.description ?? "",
    },
    content,
  };
}

/** All lessons sorted by order — the module sequence students follow. */
export function listLessons(): LessonMeta[] {
  return readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseLesson(path.join(CONTENT_DIR, f)).meta)
    .sort((a, b) => a.order - b.order);
}

export function getLesson(moduleId: string): Lesson | null {
  // module_id doubles as the file name; reject path traversal.
  if (!/^[a-z0-9-]+$/.test(moduleId)) return null;
  try {
    return parseLesson(path.join(CONTENT_DIR, `${moduleId}.mdx`));
  } catch {
    return null;
  }
}
