import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
// Type-only imports (erased at runtime) — drizzle-kit loads this file
// outside Next, so it must not pull in "server-only" or path aliases.
import type { ChallengeType, PublicTestCase, UserRole } from "../types";
import type { LogicSpec, TruthTable } from "../logic/spec";

/*
 * TS keys mirror the SQL column names (snake_case) so rows line up with
 * the domain types in src/lib/types.ts.
 */

const tz = { withTimezone: true } as const;

export const users = pgTable(
  "users",
  {
    /** Google providerAccountId (stable across sign-ins). */
    uid: text("uid").primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    photo_url: text("photo_url"),
    role: text("role").$type<UserRole>().notNull().default("student"),
    total_xp: integer("total_xp").notNull().default(0),
    unlocked_modules: text("unlocked_modules").array().notNull().default(sql`'{}'::text[]`),
    created_at: timestamp("created_at", tz).notNull().defaultNow(),
    last_login_at: timestamp("last_login_at", tz).notNull().defaultNow(),
    /** `scrypt$N$r$p$salt$hash`; null = no password sign-in (Google-only row). */
    password_hash: text("password_hash"),
    /** Set on create/reset — the proxy holds the user on /account/password. */
    must_change_password: boolean("must_change_password").notNull().default(false),
    /** Bumped on every password change/reset; older sessions stop validating. */
    session_version: integer("session_version").notNull().default(0),
    failed_logins: integer("failed_logins").notNull().default(0),
    locked_until: timestamp("locked_until", tz),
  },
  (t) => [check("users_role_check", sql`${t.role} in ('student', 'teacher', 'admin')`)]
);

export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  syllabus_ref: text("syllabus_ref").notNull().default(""),
  title: text("title").notNull(),
  order: integer("order").notNull(),
  description: text("description").notNull().default(""),
  lesson_mdx: text("lesson_mdx").notNull().default(""),
});

export const challenges = pgTable(
  "challenges",
  {
    id: text("id").primaryKey(),
    module_id: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    type: text("type").$type<ChallengeType>().notNull(),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    xp_reward: integer("xp_reward").notNull(),
    order: integer("order").notNull(),
    language: text("language").$type<"python">(),
    starter_code: text("starter_code"),
    public_test_cases: jsonb("public_test_cases").$type<PublicTestCase[]>(),
    options: jsonb("options").$type<string[]>(),
    has_hint: boolean("has_hint"),
    logic_spec: jsonb("logic_spec").$type<LogicSpec>(),
  },
  (t) => [
    index("challenges_module_id_idx").on(t.module_id),
    check("challenges_type_check", sql`${t.type} in ('mcq', 'tracing', 'coding', 'theory', 'logic')`),
  ]
);

/** Secret half of a challenge — never serialized to the client. */
export const challengeAnswers = pgTable("challenge_answers", {
  challenge_id: text("challenge_id")
    .primaryKey()
    .references(() => challenges.id, { onDelete: "cascade" }),
  hidden_test_cases: jsonb("hidden_test_cases").$type<PublicTestCase[]>(),
  hint: text("hint"),
  correct_answer_index: integer("correct_answer_index"),
  expected_answer: text("expected_answer"),
  mark_scheme: text("mark_scheme"),
  expected_table: jsonb("expected_table").$type<TruthTable>(),
});

export const submissions = pgTable(
  "submissions",
  {
    uid: text("uid")
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" }),
    challenge_id: text("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    passed: boolean("passed").notNull().default(false),
    attempts: integer("attempts").notNull().default(0),
    // Null until the first graded attempt (a hint alone records none), so
    // the editor falls back to the challenge's starter code.
    code_snapshot: text("code_snapshot"),
    hint_used: boolean("hint_used").notNull().default(false),
    updated_at: timestamp("updated_at", tz).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.uid, t.challenge_id] })]
);

export const certificates = pgTable("certificates", {
  id: text("id").primaryKey(),
  uid: text("uid")
    .notNull()
    .unique()
    .references(() => users.uid, { onDelete: "cascade" }),
  name: text("name").notNull(),
  syllabus: text("syllabus").notNull(),
  issued_at: timestamp("issued_at", tz).notNull().defaultNow(),
});

export const news = pgTable("news", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body_mdx: text("body_mdx").notNull(),
  image_url: text("image_url"),
  video_url: text("video_url"),
  audio_url: text("audio_url"),
  author_name: text("author_name"),
  // No FK: a post outlives its author's account.
  author_uid: text("author_uid").notNull(),
  published_at: timestamp("published_at", tz).notNull().defaultNow(),
});

export const contests = pgTable("contests", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  starts_at: timestamp("starts_at", tz).notNull(),
  ends_at: timestamp("ends_at", tz).notNull(),
});

export const contestProblems = pgTable(
  "contest_problems",
  {
    contest_id: text("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    order: integer("order").notNull(),
    points: integer("points").notNull(),
    starter_code: text("starter_code"),
    public_test_cases: jsonb("public_test_cases").$type<PublicTestCase[]>().notNull().default([]),
    kind: text("kind").$type<"python" | "logic">().notNull().default("python"),
    logic_spec: jsonb("logic_spec").$type<LogicSpec>(),
  },
  (t) => [
    primaryKey({ columns: [t.contest_id, t.id] }),
    check("contest_problems_kind_check", sql`${t.kind} in ('python', 'logic')`),
  ]
);

export const contestProblemAnswers = pgTable(
  "contest_problem_answers",
  {
    contest_id: text("contest_id").notNull(),
    problem_id: text("problem_id").notNull(),
    hidden_test_cases: jsonb("hidden_test_cases").$type<PublicTestCase[]>().notNull().default([]),
    expected_table: jsonb("expected_table").$type<TruthTable>(),
  },
  (t) => [
    primaryKey({ columns: [t.contest_id, t.problem_id] }),
    foreignKey({
      columns: [t.contest_id, t.problem_id],
      foreignColumns: [contestProblems.contest_id, contestProblems.id],
    }).onDelete("cascade"),
  ]
);

export const contestParticipants = pgTable(
  "contest_participants",
  {
    contest_id: text("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    uid: text("uid")
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" }),
    name: text("name"),
    email: text("email").notNull(),
    /** problem id → best score */
    scores: jsonb("scores").$type<Record<string, number>>().notNull().default({}),
    total: integer("total").notNull().default(0),
    last_improved_at: timestamp("last_improved_at", tz),
    registered_at: timestamp("registered_at", tz).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contest_id, t.uid] })]
);

/** Append-only attempt log. */
export const contestSubmissions = pgTable(
  "contest_submissions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    contest_id: text("contest_id").notNull(),
    uid: text("uid").notNull(),
    problem_id: text("problem_id").notNull(),
    code: text("code").notNull(),
    score: integer("score").notNull(),
    passed_tests: integer("passed_tests").notNull(),
    total_tests: integer("total_tests").notNull(),
    submitted_at: timestamp("submitted_at", tz).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.contest_id, t.uid],
      foreignColumns: [contestParticipants.contest_id, contestParticipants.uid],
    }).onDelete("cascade"),
  ]
);
