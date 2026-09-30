/*
 * A student's class ("11A") in one canonical spelling, so the leaderboard
 * filter never splits a class in two: upper case, no spaces or dashes, and
 * Cyrillic letters that look Latin folded to Latin ("11А" typed on a
 * Mongolian keyboard is the same class as "11A").
 */

export const MAX_CLASS_LENGTH = 10;
export const CLASS_ERROR = `Анги нь ${MAX_CLASS_LENGTH} хүртэлх үсэг, тооноос бүрдэнэ (жишээ: 11A).`;

const LOOK_ALIKE: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X",
};
const VALID = new RegExp(`^[\\p{L}\\p{N}]{1,${MAX_CLASS_LENGTH}}$`, "u");

export type ClassNameResult = { ok: true; value: string | null } | { ok: false };

/** Blank → no class (null); otherwise the canonical spelling, or not ok. */
export function parseClassName(raw: string | null | undefined): ClassNameResult {
  const compact = (raw ?? "").toUpperCase().replace(/[\s-]+/g, "");
  if (compact === "") return { ok: true, value: null };
  const value = [...compact].map((ch) => LOOK_ALIKE[ch] ?? ch).join("");
  return VALID.test(value) ? { ok: true, value } : { ok: false };
}

const byNumberThenLetter = (a: string, b: string) =>
  a.localeCompare(b, "mn", { numeric: true });

/** Each class once, 9A before 10A. */
export function classOptions(classes: readonly (string | null)[]): string[] {
  return [...new Set(classes.filter((c): c is string => !!c))].sort(byNumberThenLetter);
}

/** `?class=` → one of `options`, whatever the spelling; otherwise null (all). */
export function classFromParam(
  param: string | string[] | undefined,
  options: readonly string[]
): string | null {
  const parsed = parseClassName(Array.isArray(param) ? param[0] : param);
  return parsed.ok && parsed.value && options.includes(parsed.value) ? parsed.value : null;
}
