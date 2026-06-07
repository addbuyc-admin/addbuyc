import type { CategorySlug } from "@/lib/categories";

export type NotificationActorProfile = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type Notification = {
  id: number;
  user_id: string;
  type: "post_reply" | "post_like" | "reply_like" | "best_answer" | "user_follow" | "followed_post_reply";
  post_id: number | null;
  reply_id: number | null;
  actor_user_id: string | null;
  actor_profile: NotificationActorProfile | null;
  read_at: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageUrls: string[];
  likes: number;
  createdAt: string;
  category: CategorySlug;
  targetUrl: string | null;
  status: "published" | "hidden";
  hasBestAnswer: boolean;
};
