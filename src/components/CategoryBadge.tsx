import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug } from "@/lib/categories";

type Props = {
  category: CategorySlug;
};

const FALLBACK = CATEGORIES.find((c) => c.slug === "other")!;

export function CategoryBadge({ category }: Props) {
  const cat = CATEGORIES.find((c) => c.slug === category) ?? FALLBACK;
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cat.badgeClassName}`}
    >
      {cat.label}
    </span>
  );
}
