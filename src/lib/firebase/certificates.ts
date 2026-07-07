import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";

export const SYLLABUS_TITLE = "IBDP Computer Science (2027 syllabus)";

export interface Certificate {
  id: string;
  uid: string;
  name: string;
  syllabus: string;
  /** ISO date string (issue date). */
  issued_at: string;
}

function toCertificate(id: string, data: FirebaseFirestore.DocumentData): Certificate {
  return {
    id,
    uid: data.uid,
    name: data.name,
    syllabus: data.syllabus,
    issued_at: (data.issued_at as Timestamp).toDate().toISOString().slice(0, 10),
  };
}

/**
 * Mints the certificate record once per student. The caller must have
 * verified course completion server-side first.
 */
export async function getOrCreateCertificate(
  uid: string,
  name: string
): Promise<Certificate> {
  const db = getDb();
  const col = db.collection("certificates");

  const existing = await col.where("uid", "==", uid).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    return toCertificate(doc.id, doc.data());
  }

  const ref = col.doc();
  await ref.set({
    uid,
    name,
    syllabus: SYLLABUS_TITLE,
    issued_at: FieldValue.serverTimestamp(),
  });
  const snap = await ref.get();
  return toCertificate(ref.id, snap.data()!);
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  const snap = await getDb().collection("certificates").doc(id).get();
  return snap.exists ? toCertificate(snap.id, snap.data()!) : null;
}
