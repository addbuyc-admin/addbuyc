"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Post } from "@/lib/types";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthProvider";

type PostsContextValue = {
  posts: Post[];
  ready: boolean;
  addPost: (input: Omit<Post, "id" | "createdAt" | "likes" | "status" | "hasBestAnswer">) => Promise<void>;
  likePost: (id: string, isLiked?: boolean) => Promise<number | null>;
  refetchPosts: () => Promise<void>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

type PostRow = {
  id: number | string;
  title: string;
  description: string;
  image_url: string | null;
  image_urls: string[] | null;
  likes: number | null;
  created_at: string;
  category: string | null;
  target_url: string | null;
  status: string | null;
};

function toDbId(id: string) {
  return /^\d+$/.test(id) ? Number(id) : id;
}

const VALID_CATEGORIES: Set<string> = new Set(CATEGORIES.map((c) => c.slug));

function toCategory(value: string | null): CategorySlug {
  if (value && VALID_CATEGORIES.has(value)) return value as CategorySlug;
  return "other";
}

function mapRowToPost(row: PostRow): Post {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
    likes: typeof row.likes === "number" ? row.likes : 0,
    createdAt: row.created_at,
    category: toCategory(row.category),
    targetUrl: row.target_url,
    status: row.status === "hidden" ? "hidden" : "published",
    hasBestAnswer: false,
  };
}

export function PostsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);

  const fetchPosts = useCallback(async () => {
    const [postsResult, bestAnswerResult] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, description, image_url, image_urls, likes, created_at, category, target_url, status")
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase
        .from("replies")
        .select("post_id")
        .eq("is_best_answer", true)
        .eq("status", "published"),
    ]);
    if (postsResult.error) {
      console.error("Failed to load posts:", postsResult.error.message);
      setPosts([]);
      return;
    }
    const bestAnswerPostIds = new Set(
      (bestAnswerResult.data ?? []).map((r) => String((r as { post_id: number }).post_id)),
    );
    const mapped = (postsResult.data ?? []).map((row) => ({
      ...mapRowToPost(row as PostRow),
      hasBestAnswer: bestAnswerPostIds.has(String((row as PostRow).id)),
    }));
    setPosts(mapped);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await fetchPosts();
      if (mounted) setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchPosts]);

  const addPost = useCallback(
    async (input: Omit<Post, "id" | "createdAt" | "likes" | "status" | "hasBestAnswer">) => {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: input.title,
          description: input.description,
          image_url: input.imageUrl,
          image_urls: input.imageUrls,
          likes: 0,
          category: input.category,
          target_url: input.targetUrl,
          user_id: userId,
        })
        .select("id, title, description, image_url, image_urls, likes, created_at, category, target_url, status")
        .single();
      if (error) {
        console.error("Failed to create post:", error.message);
        throw new Error("Failed to create post");
      }
      setPosts((prev) => [mapRowToPost(data as PostRow), ...prev]);
    },
    [userId],
  );

  const likePost = useCallback(async (id: string, isLiked = false) => {
    if (!userId) return null;
    // ログインユーザー: post_likes を INSERT / DELETE し、trigger が posts.likes を更新
    if (!isLiked) {
      const { error } = await supabase
        .from("post_likes")
        .insert({ post_id: toDbId(id), user_id: userId });
      if (error) {
        console.error("Failed to like post:", error.message);
        return null;
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", toDbId(id))
        .eq("user_id", userId);
      if (error) {
        console.error("Failed to unlike post:", error.message);
        return null;
      }
    }
    const { data: refreshed, error: refreshError } = await supabase
      .from("posts")
      .select("likes")
      .eq("id", toDbId(id))
      .maybeSingle();
    if (refreshError) {
      console.error("Failed to refresh post likes:", refreshError.message);
    }
    const persistedLikes =
      typeof (refreshed as { likes?: number | null } | null)?.likes === "number"
        ? (refreshed as { likes: number }).likes
        : null;
    if (persistedLikes !== null) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, likes: persistedLikes } : p)),
      );
    }
    return persistedLikes;
  }, [userId]);

  const value = useMemo(
    () => ({ posts, ready, addPost, likePost, refetchPosts: fetchPosts }),
    [posts, ready, addPost, likePost, fetchPosts],
  );

  return (
    <PostsContext.Provider value={value}>{children}</PostsContext.Provider>
  );
}

export function usePosts() {
  const ctx = useContext(PostsContext);
  if (!ctx) {
    throw new Error("usePosts must be used within PostsProvider");
  }
  return ctx;
}
