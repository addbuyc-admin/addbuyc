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
  addPost: (input: Omit<Post, "id" | "createdAt" | "likes" | "status">) => Promise<void>;
  likePost: (id: string) => Promise<number | null>;
  refetchPosts: () => Promise<void>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

type PostRow = {
  id: number | string;
  title: string;
  description: string;
  image_url: string | null;
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
    likes: typeof row.likes === "number" ? row.likes : 0,
    createdAt: row.created_at,
    category: toCategory(row.category),
    targetUrl: row.target_url,
    status: row.status === "hidden" ? "hidden" : "published",
  };
}

export function PostsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, description, image_url, likes, created_at, category, target_url, status")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load posts:", error.message);
      setPosts([]);
      return;
    }
    const mapped = (data ?? []).map((row) => mapRowToPost(row as PostRow));
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
    async (input: Omit<Post, "id" | "createdAt" | "likes" | "status">) => {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: input.title,
          description: input.description,
          image_url: input.imageUrl,
          likes: 0,
          category: input.category,
          target_url: input.targetUrl,
          user_id: userId,
        })
        .select("id, title, description, image_url, likes, created_at, category, target_url, status")
        .single();
      if (error) {
        console.error("Failed to create post:", error.message);
        throw new Error("Failed to create post");
      }
      setPosts((prev) => [mapRowToPost(data as PostRow), ...prev]);
    },
    [userId],
  );

  const likePost = useCallback(async (id: string) => {
    const target = posts.find((p) => p.id === id);
    let currentLikesBase = target?.likes ?? 0;
    const nextLikes = currentLikesBase + 1;
    if (target) {
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, likes: nextLikes } : p)),
      );
    }

    let likesToPersist = nextLikes;
    if (!target) {
      const { data: current, error: currentError } = await supabase
        .from("posts")
        .select("likes")
        .eq("id", toDbId(id))
        .single();
      if (currentError) {
        console.error("Failed to fetch post before like:", currentError.message);
        return null;
      }
      const currentLikes =
        typeof (current as { likes?: number | null } | null)?.likes === "number"
          ? (current as { likes: number }).likes
          : 0;
      currentLikesBase = currentLikes;
      likesToPersist = currentLikes + 1;
    }

    const { error } = await supabase
      .from("posts")
      .update({ likes: likesToPersist })
      .eq("id", toDbId(id));
    if (error) {
      console.error("Failed to like post:", error.message);
      if (target) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, likes: target.likes } : p)),
        );
      }
      return null;
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
        : likesToPersist;
    if (persistedLikes < likesToPersist) {
      console.error(
        "Failed to persist post like: update did not change row (check RLS/policies).",
      );
      if (target) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, likes: currentLikesBase } : p)),
        );
      }
      return null;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: persistedLikes } : p)),
    );
    return persistedLikes;
  }, [posts]);

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
