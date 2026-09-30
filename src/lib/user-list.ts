import { CLASS_ERROR, parseClassName } from "@/lib/class-name";
import { ALLOWED_DOMAIN } from "@/lib/constants";

export const MAX_USERS_PER_PASTE = 200;

export interface ParsedUser {
  email: string;
  name: string;
  /** Optional third column, e.g. "11A"; null when blank. */
  class_name: string | null;
}

export interface UserListError {
  /** 1-based line in the pasted text; 0 for list-level problems. */
  line: number;
  message: string;
}

export type ParseResult =
  | { ok: true; users: ParsedUser[] }
  | { ok: false; errors: UserListError[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Parses "email, name, class" rows pasted from a spreadsheet (tab, comma or
 * semicolon separated). All-or-nothing: one bad row rejects the list,
 * so a teacher never ends up with half a class created.
 */
export function parseUserList(text: string): ParseResult {
  const rows = text
    .split(/\r?\n/)
    .map((raw, i) => ({ line: i + 1, cells: raw.split(/[\t,;]/) }))
    .filter(({ cells }) => cells.join("").trim() !== "")
    // A copied header row ("Имэйл, Нэр") has no address in it.
    .filter(({ line, cells }) => !(line === 1 && !cells[0].includes("@")));

  if (rows.length === 0) {
    return { ok: false, errors: [{ line: 0, message: "Жагсаалт хоосон байна." }] };
  }
  if (rows.length > MAX_USERS_PER_PASTE) {
    return {
      ok: false,
      errors: [
        {
          line: 0,
          message: `Нэг удаад хамгийн ихдээ ${MAX_USERS_PER_PASTE} хүн нэмнэ (одоо ${rows.length}).`,
        },
      ],
    };
  }

  const users: ParsedUser[] = [];
  const errors: UserListError[] = [];
  const seen = new Set<string>();
  for (const { line, cells } of rows) {
    const email = normalizeEmail(cells[0]);
    const klass = parseClassName(cells[2]);
    if (!EMAIL_RE.test(email)) {
      errors.push({ line, message: `${line}-р мөр: «${cells[0].trim()}» нь имэйл хаяг биш байна.` });
    } else if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      errors.push({ line, message: `${line}-р мөр: зөвхөн @${ALLOWED_DOMAIN} хаяг зөвшөөрөгдөнө.` });
    } else if (seen.has(email)) {
      errors.push({ line, message: `${line}-р мөр: ${email} жагсаалтад давхардсан байна.` });
    } else if (!klass.ok) {
      errors.push({ line, message: `${line}-р мөр: «${(cells[2] ?? "").trim()}» — ${CLASS_ERROR}` });
    } else {
      seen.add(email);
      users.push({
        email,
        name: (cells[1] ?? "").trim() || email.split("@")[0],
        class_name: klass.value,
      });
    }
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, users };
}
