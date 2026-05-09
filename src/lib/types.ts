import type { CategorySlug } from "@/lib/categories";

export type Post = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  likes: number;
  createdAt: string;
  category: CategorySlug;
  targetUrl: string | null;
};
