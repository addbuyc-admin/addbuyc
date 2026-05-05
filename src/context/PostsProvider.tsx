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
import { SEED_POSTS } from "@/lib/seed-posts";

const STORAGE_KEY = "addbuy-c-posts";

type PostsContextValue = {
  posts: Post[];
  ready: boolean;
  addPost: (input: Omit<Post, "id" | "createdAt" | "likes">) => void;
  likePost: (id: string) => void;
};

const PostsContext = createContext<PostsContextValue | null>(null);

function loadInitial(): Post[] {
  if (typeof window === "undefined") return SEED_POSTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_POSTS;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return SEED_POSTS;
    return parsed as Post[];
  } catch {
    return SEED_POSTS;
  }
}

export function PostsProvider({ children }: { children: ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPosts(loadInitial());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch {
      // quota exceeded or private mode — still allow in-memory use
    }
  }, [posts, ready]);

  const addPost = useCallback(
    (input: Omit<Post, "id" | "createdAt" | "likes">) => {
      const newPost: Post = {
        ...input,
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `post-${Date.now()}`,
        likes: 0,
        createdAt: new Date().toISOString(),
      };
      setPosts((prev) => [newPost, ...prev]);
    },
    [],
  );

  const likePost = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p)),
    );
  }, []);

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
