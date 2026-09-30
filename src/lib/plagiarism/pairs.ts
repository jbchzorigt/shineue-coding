import { circuitShape, compareShapes } from "@/lib/plagiarism/circuit";
import { comparePython, preparePython, starterFingerprints } from "@/lib/plagiarism/python";

export const SIMILARITY_THRESHOLD = 0.7;
export const MAX_PAIRS = 50;

export interface SimilarEntry {
  uid: string;
  /** Participant name, or their email when they have none. */
  name: string;
  score: number;
  /** Python code or the circuit JSON, as stored. */
  answer: string;
}

export interface SimilarPair {
  a: SimilarEntry;
  b: SimilarEntry;
  /** 0–1 */
  similarity: number;
}

/** Pairs of one problem's answers at or above the threshold, most alike first. */
export function findSimilarPairs(
  kind: "python" | "logic",
  entries: readonly SimilarEntry[],
  opts: { starterCode?: string } = {}
): { pairs: SimilarPair[]; skipped: number } {
  if (kind === "python") {
    const starter = starterFingerprints(opts.starterCode);
    return pairUp(entries, (e) => preparePython(e.answer, starter), comparePython);
  }
  return pairUp(entries, (e) => circuitShape(e.answer), compareShapes);
}

function pairUp<T>(
  entries: readonly SimilarEntry[],
  prepare: (entry: SimilarEntry) => T | null,
  compare: (a: T, b: T) => number
): { pairs: SimilarPair[]; skipped: number } {
  const ready = entries.flatMap((entry) => {
    const shape = prepare(entry);
    return shape === null ? [] : [{ entry, shape }];
  });
  const pairs: SimilarPair[] = [];
  for (let i = 0; i < ready.length; i++) {
    for (let j = i + 1; j < ready.length; j++) {
      const similarity = compare(ready[i].shape, ready[j].shape);
      if (similarity >= SIMILARITY_THRESHOLD) {
        pairs.push({ a: ready[i].entry, b: ready[j].entry, similarity });
      }
    }
  }
  // Stable: equal scores keep the entries' order.
  pairs.sort((x, y) => y.similarity - x.similarity);
  return { pairs: pairs.slice(0, MAX_PAIRS), skipped: entries.length - ready.length };
}
