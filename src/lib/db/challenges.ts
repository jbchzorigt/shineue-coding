import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb, isForeignKeyViolation } from "@/lib/db/client";
import { challengeAnswers, challenges } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";
import type { Challenge, ChallengePrivate } from "@/lib/types";

function toChallenge(r: typeof challenges.$inferSelect): Challenge {
  return {
    id: r.id,
    module_id: r.module_id,
    type: r.type,
    title: r.title,
    prompt: r.prompt,
    xp_reward: r.xp_reward,
    order: r.order,
    language: r.language ?? undefined,
    starter_code: r.starter_code ?? undefined,
    public_test_cases: r.public_test_cases ?? undefined,
    options: r.options ?? undefined,
    has_hint: r.has_hint ?? undefined,
    logic_spec: r.logic_spec ?? undefined,
  };
}

function toPrivate(r: typeof challengeAnswers.$inferSelect): ChallengePrivate {
  return {
    hidden_test_cases: r.hidden_test_cases ?? undefined,
    hint: r.hint ?? undefined,
    correct_answer_index: r.correct_answer_index ?? undefined,
    expected_answer: r.expected_answer ?? undefined,
    mark_scheme: r.mark_scheme ?? undefined,
    expected_table: r.expected_table ?? undefined,
  };
}

export async function getChallenge(id: string): Promise<Challenge | null> {
  const [row] = await getDb().select().from(challenges).where(eq(challenges.id, id)).limit(1);
  return row ? toChallenge(row) : null;
}

/** Server-side only — hidden tests must never be serialized to the client. */
export async function getChallengePrivate(id: string): Promise<ChallengePrivate | null> {
  const [row] = await getDb()
    .select()
    .from(challengeAnswers)
    .where(eq(challengeAnswers.challenge_id, id))
    .limit(1);
  return row ? toPrivate(row) : null;
}

export async function listChallengesByModule(moduleId: string): Promise<Challenge[]> {
  const rows = await getDb()
    .select()
    .from(challenges)
    .where(eq(challenges.module_id, moduleId))
    .orderBy(asc(challenges.order), asc(challenges.id));
  return rows.map(toChallenge);
}

/**
 * Writes public + private parts together (teacher content editor, seeds).
 * Replaces the whole challenge: optional fields left out are cleared.
 */
export async function upsertChallenge(
  challenge: Challenge,
  privateData: ChallengePrivate
): Promise<void> {
  const { id, ...c } = challenge;
  const row = {
    module_id: c.module_id,
    type: c.type,
    title: c.title,
    prompt: c.prompt,
    xp_reward: c.xp_reward,
    order: c.order,
    language: c.language ?? null,
    starter_code: c.starter_code ?? null,
    public_test_cases: c.public_test_cases ?? null,
    options: c.options ?? null,
    has_hint: c.has_hint ?? null,
    logic_spec: c.logic_spec ?? null,
  };
  const answers = {
    hidden_test_cases: privateData.hidden_test_cases ?? null,
    hint: privateData.hint ?? null,
    correct_answer_index: privateData.correct_answer_index ?? null,
    expected_answer: privateData.expected_answer ?? null,
    mark_scheme: privateData.mark_scheme ?? null,
    expected_table: privateData.expected_table ?? null,
  };

  try {
    await getDb().transaction(async (tx) => {
      await tx
        .insert(challenges)
        .values({ id, ...row })
        .onConflictDoUpdate({ target: challenges.id, set: row });
      await tx
        .insert(challengeAnswers)
        .values({ challenge_id: id, ...answers })
        .onConflictDoUpdate({ target: challengeAnswers.challenge_id, set: answers });
    });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new UserError(`Модуль олдсонгүй: ${c.module_id}`);
    throw err;
  }
}

/** Also deletes the answers and every submission of it (FK cascade). */
export async function deleteChallenge(id: string): Promise<void> {
  await getDb().delete(challenges).where(eq(challenges.id, id));
}
