"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Post } from "@/lib/types";

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

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const postId = params.id;
    if (!postId) {
      setError("Post ID is missing.");
      setLoading(false);
      return;
    }

    void (async () => {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, likes, created_at")
        .eq("id", postId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setPost(null);
          setError("Post not found.");
        } else {
          setError("Failed to load post.");
        }
        setLoading(false);
        return;
      }

      setPost(mapRowToPost(data as PostRow));
      setLoading(false);
    })();
  }, [params.id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
      >
        ← Back to posts
      </Link>

      {loading ? (
        <div className="mt-6 h-52 animate-pulse rounded-2xl bg-zinc-100" />
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          <p className="text-zinc-600">{error}</p>
        </div>
      ) : post ? (
        <article className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-6">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {post.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <time dateTime={post.createdAt}>
                {new Date(post.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
              <span aria-hidden>•</span>
              <span>Likes: {post.likes}</span>
            </div>
            <p className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">
              {post.description}
            </p>
          </div>

          {post.imageUrl && (
            <div className="border-t border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt=""
                className="max-h-[500px] w-full object-cover"
              />
            </div>
          )}
        </article>
      ) : null}
    </div>
  );
}
