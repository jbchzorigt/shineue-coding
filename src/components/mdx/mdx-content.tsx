import type { ComponentProps } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { Callout } from "@/components/mdx/callout";
import { GateSymbol } from "@/components/logic/gate-symbol";
import { GateTable } from "@/components/logic/gate-table";
import type { GateType } from "@/lib/logic/gates";
import { mdxError, normalizeMdx } from "@/lib/mdx-check";

/** Inline gate symbol for lessons: <Gate type="NAND" /> */
function Gate({ type }: { type: GateType }) {
  return <GateSymbol type={type} className="inline-block h-8 w-12 align-middle" />;
}

/** "HL" label after an HL-only section title: `## A1.3.5 … <HL />` */
function HL() {
  return (
    <span className="not-prose ml-2 inline-flex items-center rounded-full bg-violet-100 px-2 py-0.5 align-middle text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
      HL
    </span>
  );
}

/** A wide table scrolls in its own box instead of widening the page on phones. */
function Table(props: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  );
}

const components = {
  Callout,
  Gate,
  GateTable,
  HL,
  table: Table,
};

/**
 * Renders a lesson's MDX body with GFM tables and Shiki-highlighted code.
 * Content saved before the editor validated it can still be broken; that
 * shows an explanation in place of the body instead of failing the page.
 */
export async function MdxContent({ source }: { source: string }) {
  const src = normalizeMdx(source);
  try {
    const { content } = await compileMDX({
      source: src,
      components,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            [rehypePrettyCode, { theme: "github-dark-default", keepBackground: true }],
          ],
        },
      },
    });
    return content;
  } catch {
    return (
      <p
        role="alert"
        className="not-prose rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
      >
        {(await mdxError(src)) ?? "Агуулгыг харуулж чадсангүй."}
      </p>
    );
  }
}
