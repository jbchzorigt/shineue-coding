import Link from "next/link";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORIES, newsCategoryInfo, type NewsCategory } from "@/lib/news-categories";

export function NewsCategoryBadge({ category }: { category: string }) {
  const info = newsCategoryInfo(category);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        info.className
      )}
    >
      {info.label}
    </span>
  );
}

/**
 * «Бүгд · Мэдэгдэл · Тэмцээн …» chips. Plain links to `?category=`, so the
 * list is filtered on the server; scroll={false} keeps the reader's place.
 */
export function NewsCategoryFilter({
  active,
  basePath,
}: {
  active: NewsCategory | null;
  basePath: string;
}) {
  const chip = "rounded-full border px-3 py-1 text-sm font-medium transition-colors";
  const idle = "bg-background text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <nav aria-label="Мэдээний ангилал" className="flex flex-wrap gap-2">
      <Link
        href={basePath}
        scroll={false}
        aria-current={active === null ? "page" : undefined}
        className={cn(chip, active === null ? "border-transparent bg-primary text-primary-foreground" : idle)}
      >
        Бүгд
      </Link>
      {NEWS_CATEGORIES.map((c) => (
        <Link
          key={c.id}
          href={`${basePath}?category=${c.id}`}
          scroll={false}
          aria-current={active === c.id ? "page" : undefined}
          className={cn(chip, active === c.id ? cn("border-transparent", c.className) : idle)}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}
