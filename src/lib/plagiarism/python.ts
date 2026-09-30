/*
 * Python answer fingerprints for spotting copies (winnowing, as in MOSS).
 * Names, strings and numbers are blurred first, so renaming variables,
 * editing comments or reformatting does not hide a copy.
 */

/** Keywords and builtins stay as written; every other bare name becomes "V". */
const KEEP = new Set([
  "False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue",
  "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in",
  "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
  "print", "input", "int", "float", "str", "bool", "len", "range", "list", "dict", "set", "tuple",
  "map", "filter", "sorted", "reversed", "sum", "min", "max", "abs", "round", "enumerate", "zip",
  "open", "ord", "chr",
]);

/**
 * 1 comment · 2 string · 3 number · 4 name · 5 operator or bracket.
 * Names are Unicode (Python 3 allows `нийлбэр = 0`), hence the u flag.
 */
const TOKEN_RE =
  /(#[^\n]*)|((?:[rRbBuUfF]{1,2})?(?:'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"))|(\d[\d_]*(?:\.\d*)?(?:[eE][+-]?\d+)?|\.\d+)|([\p{L}_][\p{L}\p{N}_]*)|(\*\*=?|\/\/=?|<<=?|>>=?|->|:=|[-+*/%&|^@<>=!]=|\S)/gu;

export function pythonTokens(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(TOKEN_RE)) {
    if (m[1] !== undefined) continue;
    if (m[2] !== undefined) out.push("S");
    else if (m[3] !== undefined) out.push("N");
    // Method and attribute names (after ".") stay: .append, .split, .count…
    else if (m[4] !== undefined) out.push(KEEP.has(m[4]) || out.at(-1) === "." ? m[4] : "V");
    else out.push(m[5]);
  }
  return out;
}

const K = 5; // tokens per hashed run
const W = 4; // runs per winnowing window
/**
 * Below this many fingerprints of its own (about 5–6 lines) an answer is too
 * small to judge: every correct answer to a tiny task looks the same.
 */
export const MIN_FINGERPRINTS = 8;

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The smallest hash of every window of W runs (rightmost on a tie). */
export function fingerprints(tokens: readonly string[]): Set<number> {
  const hashes: number[] = [];
  for (let i = 0; i + K <= tokens.length; i++) {
    hashes.push(fnv1a(tokens.slice(i, i + K).join(" ")));
  }
  const picked = new Set<number>();
  if (hashes.length === 0) return picked;
  const windows = Math.max(1, hashes.length - W + 1);
  for (let start = 0; start < windows; start++) {
    const end = Math.min(start + W, hashes.length);
    let best = start;
    for (let i = start; i < end; i++) if (hashes[i] <= hashes[best]) best = i;
    picked.add(hashes[best]);
  }
  return picked;
}

export function starterFingerprints(code: string | undefined): Set<number> {
  return fingerprints(pythonTokens(code ?? ""));
}

/** null when the answer has too little code of its own beyond the starter. */
export function preparePython(code: string, starter: ReadonlySet<number>): Set<number> | null {
  const fp = fingerprints(pythonTokens(code));
  for (const h of starter) fp.delete(h);
  return fp.size >= MIN_FINGERPRINTS ? fp : null;
}

/** Share of the smaller answer found in the other (0–1), so padding a copy doesn't hide it. */
export function comparePython(a: ReadonlySet<number>, b: ReadonlySet<number>): number {
  let shared = 0;
  for (const h of a) if (b.has(h)) shared++;
  return shared / Math.min(a.size, b.size);
}
