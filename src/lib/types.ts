import type { LogicSpec, TruthTable } from "@/lib/logic/spec";

export type UserRole = "student" | "teacher" | "admin";

/** Teachers and the super admin share all staff privileges. */
export function isStaff(role: UserRole | undefined | null): boolean {
  return role === "teacher" || role === "admin";
}

/**
 * Who may create accounts for, or reset the password of, whom: teachers
 * handle students, the admin handles students and teachers, and the admin
 * account itself is only managed by scripts/create-admin.ts.
 */
export function canManageAccount(actor: UserRole | null | undefined, target: UserRole): boolean {
  if (target === "student") return isStaff(actor);
  if (target === "teacher") return actor === "admin";
  return false;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string | null;
  photo_url: string | null;
  role: UserRole;
  total_xp: number;
  unlocked_modules: string[];
}

export type ChallengeType = "mcq" | "tracing" | "coding" | "theory" | "logic";

export interface PublicTestCase {
  input: string;
  expected_output: string;
}

/**
 * Client-visible challenge (challenges table).
 * Hidden test cases, MCQ answers and mark schemes live in the
 * challenge_answers table and must never reach the client.
 */
export interface Challenge {
  id: string;
  module_id: string;
  type: ChallengeType;
  title: string;
  /** Markdown/MDX. */
  prompt: string;
  xp_reward: number;
  order: number;
  language?: "python";
  starter_code?: string;
  public_test_cases?: PublicTestCase[];
  /** MCQ answer options — the correct index stays in challenge_answers. */
  options?: string[];
  /** Whether a hint exists — the text itself stays in challenge_answers. */
  has_hint?: boolean;
  /** logic — inputs, outputs and constraints; the expected table stays private. */
  logic_spec?: LogicSpec;
}

export interface ChallengePrivate {
  hidden_test_cases?: PublicTestCase[];
  hint?: string;
  /** mcq */
  correct_answer_index?: number;
  /** tracing — expected output/answer, compared normalized. */
  expected_answer?: string;
  /** theory — revealed after the student submits an answer. */
  mark_scheme?: string;
  /** logic — expected outputs, one row per input combination. */
  expected_table?: TruthTable;
}

/** Fraction of the XP reward kept after using a hint. */
export const HINT_XP_FACTOR = 0.7;

export interface Submission {
  challenge_id: string;
  passed: boolean;
  attempts: number;
  /** Absent until the first graded attempt (a hint alone records none). */
  code_snapshot?: string;
  hint_used?: boolean;
}

export interface Module {
  id: string;
  syllabus_ref: string; // e.g. "A1.1.1"
  title: string;
  order: number;
  prerequisite_module_id: string | null;
}
