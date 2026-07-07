import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase/admin";
import type { UserProfile } from "@/lib/types";

export interface StudentOverview {
  uid: string;
  name: string | null;
  email: string;
  total_xp: number;
  unlocked_count: number;
  passed_count: number;
  total_attempts: number;
  hints_used: number;
  last_login: string | null;
}

/** Class-sized roster — a collection scan per student is fine here. */
export async function listStudentOverviews(): Promise<StudentOverview[]> {
  const db = getDb();
  const users = await db.collection("users").where("role", "==", "student").get();

  const overviews = await Promise.all(
    users.docs.map(async (doc) => {
      const p = doc.data() as UserProfile & { last_login_at?: Timestamp };
      const submissions = await db.collection(`users/${doc.id}/submissions`).get();

      let passed = 0;
      let attempts = 0;
      let hints = 0;
      for (const sub of submissions.docs) {
        const s = sub.data();
        if (s.passed) passed++;
        attempts += s.attempts ?? 0;
        if (s.hint_used) hints++;
      }

      return {
        uid: doc.id,
        name: p.name,
        email: p.email,
        total_xp: p.total_xp ?? 0,
        unlocked_count: p.unlocked_modules?.length ?? 0,
        passed_count: passed,
        total_attempts: attempts,
        hints_used: hints,
        last_login: p.last_login_at
          ? p.last_login_at.toDate().toISOString().slice(0, 10)
          : null,
      };
    })
  );

  return overviews.sort((a, b) => b.total_xp - a.total_xp);
}
