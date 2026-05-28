import type { CategorySlug } from "@/lib/categories";

export type Notification = {
  id: number;
  user_id: string;
  type: "post_reply";
  post_id: number;
  reply_id: number;
  actor_user_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  likes: number;
  createdAt: string;
  category: CategorySlug;
  targetUrl: string | null;
  status: "published" | "hidden";
  hasBestAnswer: boolean;
};
