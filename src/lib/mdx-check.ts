/*
 * Lessons, prompts and news are MDX, where HTML must be valid JSX: a
 * teacher's plain `<img src="x.jpg">` or `<br>` is a compile error that
 * used to take the whole page down.
 */

const VOID_TAG = /<(area|br|col|embed|hr|img|input|source|track|wbr)\b((?:[^<>"']|"[^"]*"|'[^']*')*?)\s*\/?>/gi;
/** Fenced blocks and inline code are shown as written, so they are never rewritten. */
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/;

/** Unix line endings, and void HTML tags closed the JSX way (`<br />`), outside code. */
export function normalizeMdx(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .split(CODE)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(VOID_TAG, "<$1$2 />")))
    .join("");
}

/** null when the MDX compiles; otherwise a Mongolian explanation with the line. */
export async function mdxError(source: string): Promise<string | null> {
  // ESM-only packages: a dynamic import also works when tests load this file as CommonJS.
  const [{ compile }, { default: remarkGfm }] = await Promise.all([
    import("@mdx-js/mdx"),
    import("remark-gfm"),
  ]);
  try {
    await compile(source, { remarkPlugins: [remarkGfm] });
    return null;
  } catch (err) {
    const e = err as { line?: number; reason?: string; message?: string };
    const where = e.line ? ` (${e.line}-р мөр)` : "";
    return (
      `Агуулгад алдаа байна${where}: ${e.reason ?? e.message ?? "MDX"}. ` +
      "HTML тагийг хааж бичнэ үү (<div>…</div>, <img … />), «{» болон «}»-ийн өмнө \\ тавина."
    );
  }
}
