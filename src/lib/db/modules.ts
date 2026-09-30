import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { modules } from "@/lib/db/schema";

export interface ModuleDoc {
  id: string;
  syllabus_ref: string;
  title: string;
  order: number;
  description: string;
  /** Lesson body (MDX). */
  lesson_mdx: string;
}

/** All modules sorted by order — the sequence students follow. */
export async function listModules(): Promise<ModuleDoc[]> {
  return getDb().select().from(modules).orderBy(asc(modules.order), asc(modules.id));
}

export async function getModule(id: string): Promise<ModuleDoc | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const [row] = await getDb().select().from(modules).where(eq(modules.id, id)).limit(1);
  return row ?? null;
}

/** The entry module new students start with (lowest order). */
export async function getFirstModuleId(): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: modules.id })
    .from(modules)
    .orderBy(asc(modules.order), asc(modules.id))
    .limit(1);
  return row?.id ?? null;
}

export async function upsertModule(module: ModuleDoc): Promise<void> {
  const { id, ...data } = module;
  await getDb()
    .insert(modules)
    .values({ id, ...data })
    .onConflictDoUpdate({ target: modules.id, set: data });
}

/** Also deletes the module's challenges and their submissions (FK cascade). */
export async function deleteModule(id: string): Promise<void> {
  await getDb().delete(modules).where(eq(modules.id, id));
}
