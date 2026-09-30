import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * «Бүгд · 9A · 10A …» chips for a leaderboard. Plain links to `?class=`,
 * so the list is filtered on the server; nothing shows without classes.
 */
export function ClassFilter({
  options,
  active,
  basePath,
}: {
  options: readonly string[];
  active: string | null;
  basePath: string;
}) {
  if (options.length === 0) return null;
  const chip = "rounded-full border px-3 py-1 text-sm font-medium transition-colors";
  const on = "border-transparent bg-primary text-primary-foreground";
  const off = "bg-background text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <nav aria-label="Анги" className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        scroll={false}
        aria-current={active === null ? "page" : undefined}
        className={cn(chip, active === null ? on : off)}
      >
        Бүгд
      </Link>
      {options.map((c) => (
        <Link
          key={c}
          href={`${basePath}?class=${encodeURIComponent(c)}`}
          scroll={false}
          aria-current={active === c ? "page" : undefined}
          className={cn(chip, active === c ? on : off)}
        >
          {c}
        </Link>
      ))}
    </nav>
  );
}

/** The student's class after their name, e.g. «Бат 11A». */
export function ClassTag({ value }: { value: string | null | undefined }) {
  if (!value) return null;
  return <span className="ml-1.5 text-sm font-normal text-muted-foreground">{value}</span>;
}
