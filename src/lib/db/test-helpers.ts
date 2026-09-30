import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { challenges, modules, users } from "@/lib/db/schema";

/** resetDb() truncates every table — refuse anything but a *_test database. */
export function assertTestDatabaseUrl(url: string | undefined): string {
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must point at a *_test database (see .env.example).");
  }
  return url;
}

export function assertTestDatabaseName(name: string): void {
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to reset "${name}": tests only run against a *_test database.`);
  }
}

// The client reads DATABASE_URL lazily, on the first query — point it at
// the test database before any test runs.
process.env.DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL);

export async function resetDb(): Promise<void> {
  // Belt and braces: check where the pool actually connected, in case it
  // was opened before the override above took effect.
  const [row] = await getDb().execute<{ name: string }>(sql`select current_database() as name`);
  assertTestDatabaseName(row.name);
  await getDb().execute(sql`
    TRUNCATE users, modules, challenges, challenge_answers, submissions,
      certificates, news, contests, contest_problems, contest_problem_answers,
      contest_participants, contest_submissions
    RESTART IDENTITY CASCADE
  `);
}

export async function addUser(
  uid: string,
  fields: Partial<typeof users.$inferInsert> = {}
): Promise<void> {
  await getDb()
    .insert(users)
    .values({ uid, email: `${uid}@shineue.edu.mn`, name: uid, ...fields });
}

export async function addModule(id: string, order: number): Promise<void> {
  await getDb().insert(modules).values({ id, title: id, order });
}

export async function addChallenge(
  id: string,
  moduleId: string,
  fields: Partial<typeof challenges.$inferInsert> = {}
): Promise<void> {
  await getDb()
    .insert(challenges)
    .values({
      id,
      module_id: moduleId,
      type: "coding",
      title: id,
      prompt: "p",
      xp_reward: 10,
      order: 1,
      ...fields,
    });
}
