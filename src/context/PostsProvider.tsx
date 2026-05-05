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
import { supabase } from "@/lib/supabase/client";

type PostsContextValue = {
  posts: Post[];
  ready: boolean;
  addPost: (input: Omit<Post, "id" | "createdAt" | "likes">) => Promise<void>;
  likePost: (id: string) => Promise<void>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

type PostRow = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  likes: number;
  created_at: string;
};

function mapRowToPost(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    likes: row.likes,
    createdAt: row.created_at,
  };
}

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [ready, setReady] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, description, image_url, likes, created_at")
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
    async (input: Omit<Post, "id" | "createdAt" | "likes">) => {
      const { data, error } = await supabase
        .from("posts")
        .insert({
          title: input.title,
          description: input.description,
          image_url: input.imageUrl,
          likes: 0,
        })
        .select("id, title, description, image_url, likes, created_at")
        .single();
      if (error) {
        console.error("Failed to create post:", error.message);
        throw new Error("Failed to create post");
      }
      setPosts((prev) => [mapRowToPost(data as PostRow), ...prev]);
    },
    [],
  );

  const likePost = useCallback(async (id: string) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const nextLikes = target.likes + 1;
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: nextLikes } : p)),
    );
    const { error } = await supabase
      .from("posts")
      .update({ likes: nextLikes })
      .eq("id", id);
    if (error) {
      console.error("Failed to like post:", error.message);
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, likes: target.likes } : p)),
      );
    }
  }, [posts]);

  const value = useMemo(
    () => ({ posts, ready, addPost, likePost }),
    [posts, ready, addPost, likePost],
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
