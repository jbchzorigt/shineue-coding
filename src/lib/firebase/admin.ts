import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * All Firestore access goes through the Admin SDK on the server.
 * Client-side Firestore is intentionally not used — security rules
 * deny everything, and grading/XP writes stay server-authoritative.
 */
function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  // Against the emulator no service account is needed.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID ?? "demo-ibdp-cs",
    });
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // .env files store the key with literal \n sequences.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firestore is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env.local (service account key from Firebase Console → Project settings → Service accounts)."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let firestore: Firestore | undefined;

/** Lazy singleton so importing this module never throws at build time. */
export function getDb(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getAdminApp());
  }
  return firestore;
}
