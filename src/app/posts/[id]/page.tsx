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

type Reply = {
  id: string;
  postId: string;
  description: string;
  likes: number;
  createdAt: string;
};

type ReplyRow = {
  id: string;
  post_id: string;
  description: string;
  likes: number;
  created_at: string;
};

function mapRowToReply(row: ReplyRow): Reply {
  return {
    id: row.id,
    postId: row.post_id,
    description: row.description,
    likes: row.likes,
    createdAt: row.created_at,
  };
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    const postId = params.id;
    if (!postId) {
      setError("Post ID is missing.");
      setLoading(false);
      return;
    }

    void (async () => {
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, likes, created_at")
        .eq("id", postId)
        .single();

      if (postError) {
        if (postError.code === "PGRST116") {
          setPost(null);
          setError("Post not found.");
        } else {
          setError("Failed to load post.");
        }
        setLoading(false);
        return;
      }

      const { data: repliesData, error: repliesError } = await supabase
        .from("replies")
        .select("id, post_id, description, likes, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (repliesError) {
        setReplyError("Failed to load replies.");
      } else {
        setReplies((repliesData ?? []).map((row) => mapRowToReply(row as ReplyRow)));
      }

      setPost(mapRowToPost(postData as PostRow));
      setLoading(false);
    })();
  }, [params.id]);

  async function handleLikePost() {
    if (!post) return;
    const previousLikes = post.likes;
    const nextLikes = previousLikes + 1;
    setPost((prev) => (prev ? { ...prev, likes: nextLikes } : prev));
    const { error: likeError } = await supabase
      .from("posts")
      .update({ likes: nextLikes })
      .eq("id", post.id);
    if (likeError) {
      setPost((prev) => (prev ? { ...prev, likes: previousLikes } : prev));
    }
  }

  async function handleLikeReply(replyId: string) {
    const target = replies.find((reply) => reply.id === replyId);
    if (!target) return;
    const nextLikes = target.likes + 1;
    setReplies((prev) =>
      prev.map((reply) =>
        reply.id === replyId ? { ...reply, likes: nextLikes } : reply,
      ),
    );
    const { error: likeError } = await supabase
      .from("replies")
      .update({ likes: nextLikes })
      .eq("id", replyId);
    if (likeError) {
      setReplies((prev) =>
        prev.map((reply) =>
          reply.id === replyId ? { ...reply, likes: target.likes } : reply,
        ),
      );
    }
  }

  async function handleReplySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body) {
      setReplyError("Reply text is required.");
      return;
    }
    if (!post) return;
    setReplyError(null);
    setSubmittingReply(true);
    const { data, error: insertError } = await supabase
      .from("replies")
      .insert({
        post_id: post.id,
        description: body,
        likes: 0,
      })
      .select("id, post_id, description, likes, created_at")
      .single();

    if (insertError) {
      setReplyError("Failed to post reply.");
      setSubmittingReply(false);
      return;
    }

    setReplies((prev) => [...prev, mapRowToReply(data as ReplyRow)]);
    setReplyBody("");
    setSubmittingReply(false);
  }

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
        <div className="mt-6 space-y-6">
          <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="p-6">
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                {post.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4 text-sm text-zinc-500">
                <time dateTime={post.createdAt}>
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <button
                  type="button"
                  onClick={handleLikePost}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
                  aria-label={`Like post: ${post.title}`}
                >
                  <span aria-hidden className="text-base leading-none">
                    ♥
                  </span>
                  <span>{post.likes}</span>
                </button>
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

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Reply to this post
            </h2>
            <form onSubmit={handleReplySubmit} className="mt-4 space-y-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder="Write your reply..."
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
              />
              {replyError && (
                <p className="text-sm text-red-600" role="alert">
                  {replyError}
                </p>
              )}
              <button
                type="submit"
                disabled={submittingReply}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingReply ? "Posting..." : "Post reply"}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Replies
            </h2>
            {replies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center text-sm text-zinc-500">
                No replies yet. Be the first to reply.
              </div>
            ) : (
              <ul className="space-y-3">
                {replies.map((reply) => (
                  <li
                    key={reply.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                  >
                    <div className="border-l-2 border-zinc-200 pl-4">
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">
                        {reply.description}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
                        <time dateTime={reply.createdAt}>
                          {new Date(reply.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                        <button
                          type="button"
                          onClick={() => handleLikeReply(reply.id)}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
                          aria-label="Like reply"
                        >
                          <span aria-hidden className="text-base leading-none">
                            ♥
                          </span>
                          <span>{reply.likes}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
