import type { Metadata } from "next";

// Public boards carry students' names: keep them out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
