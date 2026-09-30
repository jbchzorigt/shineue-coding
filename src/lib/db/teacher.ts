import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { submissions, users } from "@/lib/db/schema";
import type { UserRole } from "@/lib/types";

export interface StudentOverview {
  uid: string;
  name: string | null;
  email: string;
  class_name: string | null;
  role: UserRole;
  total_xp: number;
  unlocked_count: number;
  passed_count: number;
  total_attempts: number;
  hints_used: number;
  /** Too many wrong passwords; a password reset unlocks. */
  locked: boolean;
  last_login: string | null;
}

/**
 * Roster with per-student submission stats in one grouped query.
 * `includeStaff` lists teachers/admin too (the admin's user management view).
 */
export async function listStudentOverviews(includeStaff = false): Promise<StudentOverview[]> {
  const rows = await getDb()
    .select({
      uid: users.uid,
      name: users.name,
      email: users.email,
      class_name: users.class_name,
      role: users.role,
      total_xp: users.total_xp,
      last_login_at: users.last_login_at,
      unlocked_count: sql<number>`cardinality(${users.unlocked_modules})`.mapWith(Number),
      passed_count: sql<number>`count(*) filter (where ${submissions.passed})`.mapWith(Number),
      total_attempts: sql<number>`coalesce(sum(${submissions.attempts}), 0)`.mapWith(Number),
      hints_used: sql<number>`count(*) filter (where ${submissions.hint_used})`.mapWith(Number),
      locked: sql<boolean>`coalesce(${users.locked_until} > now(), false)`,
    })
    .from(users)
    .leftJoin(submissions, eq(submissions.uid, users.uid))
    .where(includeStaff ? undefined : eq(users.role, "student"))
    .groupBy(users.uid)
    .orderBy(desc(users.total_xp), asc(users.email));

  return rows.map(({ last_login_at, ...r }) => ({
    ...r,
    last_login: last_login_at.toISOString().slice(0, 10),
  }));
}
