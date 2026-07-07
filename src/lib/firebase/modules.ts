import "server-only";

import { getDb } from "@/lib/firebase/admin";

export interface ModuleDoc {
  id: string;
  syllabus_ref: string;
  title: string;
  order: number;
  description: string;
  /** Lesson body (MDX). */
  lesson_mdx: string;
}

const MODULES = "modules";

function fromSnap(snap: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): ModuleDoc {
  const d = snap.data()!;
  return {
    id: snap.id,
    syllabus_ref: d.syllabus_ref ?? "",
    title: d.title ?? snap.id,
    order: d.order ?? 0,
    description: d.description ?? "",
    lesson_mdx: d.lesson_mdx ?? "",
  };
}

/** All modules sorted by order — the sequence students follow. */
export async function listModules(): Promise<ModuleDoc[]> {
  const snap = await getDb().collection(MODULES).get();
  return snap.docs.map(fromSnap).sort((a, b) => a.order - b.order);
}

export async function getModule(id: string): Promise<ModuleDoc | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  const snap = await getDb().collection(MODULES).doc(id).get();
  return snap.exists ? fromSnap(snap) : null;
}

/** The entry module new students start with (lowest order). */
export async function getFirstModuleId(): Promise<string | null> {
  const modules = await listModules();
  return modules[0]?.id ?? null;
}

export async function upsertModule(module: ModuleDoc): Promise<void> {
  const { id, ...data } = module;
  await getDb().collection(MODULES).doc(id).set(data);
}

export async function deleteModule(id: string): Promise<void> {
  await getDb().collection(MODULES).doc(id).delete();
}
