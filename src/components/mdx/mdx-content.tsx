import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { Callout } from "@/components/mdx/callout";

const components = {
  Callout,
};

/** Renders a lesson's MDX body with GFM tables and Shiki-highlighted code. */
export function MdxContent({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            [rehypePrettyCode, { theme: "github-dark-default", keepBackground: true }],
          ],
        },
      }}
    />
  );
}
