/** An error whose message is written for the user (Mongolian) and safe to show. */
export class UserError extends Error {}

/** A UserError for a row that no longer exists (e.g. deleted meanwhile). */
export class NotFoundError extends UserError {}

/** Shown when a signed-in session outlives its user row (account deleted). */
export const ACCOUNT_MISSING = "Таны бүртгэл олдсонгүй — гараад дахин нэвтэрнэ үү.";

/**
 * The message a form should display: our own messages as they are,
 * anything else (a database failure carries its SQL and params) logged
 * server-side and replaced by a generic one.
 */
export function userMessage(err: unknown, fallback = "Хадгалахад алдаа гарлаа."): string {
  if (err instanceof UserError) return err.message;
  console.error(err);
  return fallback;
}
