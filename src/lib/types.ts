export type UserRole = "student" | "teacher" | "admin";

/** Teachers and the super admin share all staff privileges. */
export function isStaff(role: UserRole | undefined | null): boolean {
  return role === "teacher" || role === "admin";
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

export type ChallengeType = "mcq" | "tracing" | "coding" | "theory";

export interface PublicTestCase {
  input: string;
  expected_output: string;
}

/**
 * Client-visible challenge document (challenges/{id}).
 * Hidden test cases, MCQ answers and mark schemes live in
 * challenges/{id}/private/answers and must never reach the client.
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
  /** MCQ answer options — the correct index stays in the private doc. */
  options?: string[];
  /** Whether a hint exists — the text itself stays in the private doc. */
  has_hint?: boolean;
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
}

/** Fraction of the XP reward kept after using a hint. */
export const HINT_XP_FACTOR = 0.7;

export interface Submission {
  challenge_id: string;
  passed: boolean;
  attempts: number;
  code_snapshot: string;
  hint_used?: boolean;
}

export interface Module {
  id: string;
  syllabus_ref: string; // e.g. "A1.1.1"
  title: string;
  order: number;
  prerequisite_module_id: string | null;
}
