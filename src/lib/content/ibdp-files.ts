import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { IBDP_MODULES, type IbdpModule } from "@/lib/content/ibdp";

export interface LoadedModule {
  module: IbdpModule;
  meta: Record<string, unknown>;
  lesson: string;
  /** Parsed content/challenges/<id>.json, or null when missing. */
  challenges: unknown;
}

/** The IB DP modules whose lesson file exists — content arrives in batches. */
export function loadIbdpContent(root = process.cwd()): LoadedModule[] {
  return IBDP_MODULES.flatMap((module) => {
    const mdx = join(root, "content", "modules", `${module.id}.mdx`);
    if (!existsSync(mdx)) return [];
    const { data, content } = matter(readFileSync(mdx, "utf8"));
    const json = join(root, "content", "challenges", `${module.id}.json`);
    const challenges: unknown = existsSync(json) ? JSON.parse(readFileSync(json, "utf8")) : null;
    return [{ module, meta: data, lesson: content.trim(), challenges }];
  });
}
