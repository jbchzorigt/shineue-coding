import "server-only";

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { certificates } from "@/lib/db/schema";

export const SYLLABUS_TITLE = "IBDP Computer Science (2027 syllabus)";

export interface Certificate {
  id: string;
  uid: string;
  name: string;
  syllabus: string;
  /** ISO date string (issue date). */
  issued_at: string;
}

function toCertificate(r: typeof certificates.$inferSelect): Certificate {
  return {
    id: r.id,
    uid: r.uid,
    name: r.name,
    syllabus: r.syllabus,
    issued_at: r.issued_at.toISOString().slice(0, 10),
  };
}

/**
 * Mints the certificate record once per student (uid is UNIQUE). The
 * caller must have verified course completion server-side first.
 */
export async function getOrCreateCertificate(uid: string, name: string): Promise<Certificate> {
  const db = getDb();
  await db
    .insert(certificates)
    .values({ id: newId(), uid, name, syllabus: SYLLABUS_TITLE })
    .onConflictDoNothing({ target: certificates.uid });
  const [row] = await db.select().from(certificates).where(eq(certificates.uid, uid)).limit(1);
  return toCertificate(row);
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const [row] = await getDb().select().from(certificates).where(eq(certificates.id, id)).limit(1);
  return row ? toCertificate(row) : null;
}
