/*
 * The fixed set of news categories. Adding one means adding it here and in
 * the news_category_check constraint (src/lib/db/schema.ts + a migration).
 */

export const NEWS_CATEGORIES = [
  {
    id: "announcement",
    label: "Мэдэгдэл",
    className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    id: "contest",
    label: "Тэмцээн",
    className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    id: "lesson",
    label: "Хичээл",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    id: "achievement",
    label: "Амжилт",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    id: "event",
    label: "Арга хэмжээ",
    className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  },
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number]["id"];
export type NewsCategoryInfo = (typeof NEWS_CATEGORIES)[number];

export const DEFAULT_NEWS_CATEGORY: NewsCategory = "announcement";

export function isNewsCategory(value: unknown): value is NewsCategory {
  return NEWS_CATEGORIES.some((c) => c.id === value);
}

/** `?category=` from a page's searchParams; null for "all" or anything unknown. */
export function categoryFromParam(value: string | string[] | undefined): NewsCategory | null {
  const first = Array.isArray(value) ? value[0] : value;
  return isNewsCategory(first) ? first : null;
}

export function newsCategoryInfo(id: string): NewsCategoryInfo {
  return (
    NEWS_CATEGORIES.find((c) => c.id === id) ??
    NEWS_CATEGORIES.find((c) => c.id === DEFAULT_NEWS_CATEGORY)!
  );
}
