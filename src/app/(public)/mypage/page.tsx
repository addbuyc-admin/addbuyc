"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { getAdvisorRank } from "@/lib/advisor-rank";
import { AdvisorRankBadge } from "@/components/AdvisorRankBadge";
import type { CategorySlug } from "@/lib/categories";

const MAX_LENGTH = 20;
const REPLY_EXCERPT_LEN = 60;

function truncate(text: string, len = REPLY_EXCERPT_LEN): string {
  return text.length > len ? text.slice(0, len) + "…" : text;
}

type MyPost = {
  id: number;
  title: string;
  created_at: string;
  category: string;
  likes: number;
  status: string;
};

type MyReply = {
  id: number;
  description: string;
  created_at: string;
  likes: number;
  is_best_answer: boolean;
  status: string;
  post_id: number;
  posts: { id: number; title: string } | null;
};

type MyStats = {
  post_count: number;
  reply_count: number;
  total_reply_likes: number;
  best_answer_count: number;
};

export default function MyPage() {
  const { user, loading, refreshDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myReplies, setMyReplies] = useState<MyReply[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    void (async () => {
      const [profileResult, postsResult, repliesResult, statsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("posts")
            .select("id, title, created_at, category, likes, status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("replies")
            .select("id, description, created_at, likes, is_best_answer, status, post_id, posts(id, title)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_stats")
            .select("post_count, reply_count, total_reply_likes, best_answer_count")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

      setDisplayName(profileResult.data?.display_name ?? "");
      setMyPosts((postsResult.data ?? []) as MyPost[]);
      setMyReplies((repliesResult.data ?? []) as unknown as MyReply[]);
      setMyStats(statsResult.data as MyStats | null);
      setFetching(false);
    })();
  }, [user, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = displayName.trim();
    setError(null);
    setSuccess(false);

    if (!trimmed) {
      setError("表示名を入力してください");
      return;
    }
    if (!user) return;

    setSaving(true);
    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: trimmed,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("Failed to save display_name:", upsertError.message);
      setError("保存に失敗しました。しばらくしてから再度お試しください。");
      setSaving(false);
      return;
    }

    setDisplayName(trimmed);
    await refreshDisplayName();
    setSuccess(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          <p className="text-sm text-zinc-600">
            マイページを利用するにはサインインが必要です。
          </p>
          <Link
            href="/signin"
            className="mt-4 inline-block rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            サインインへ
          </Link>
        </div>
      </div>
    );
  }

  const rank = myStats ? getAdvisorRank(myStats) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          マイページ
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
      </div>

      <div className="space-y-6">
        {/* Phase L: 実績・ランク */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">実績・アドバイザーランク</h2>
          {fetching ? (
            <div className="mt-4 h-16 animate-pulse rounded-xl bg-zinc-100" />
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "投稿数", value: myStats?.post_count ?? 0 },
                  { label: "返信数", value: myStats?.reply_count ?? 0 },
                  { label: "返信Like合計", value: myStats?.total_reply_likes ?? 0 },
                  { label: "ベストアンサー", value: myStats?.best_answer_count ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-center">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="mt-1 text-xl font-semibold text-zinc-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-zinc-600">現在のランク：</span>
                <AdvisorRankBadge rank={rank} showNone />
              </div>
              <div className="mt-3">
                <Link
                  href="/advisor-ranks"
                  className="text-xs text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline"
                >
                  アドバイザーランクについて
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Profile settings */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            プロフィール設定
          </h2>

          {fetching ? (
            <div className="mt-4 h-12 animate-pulse rounded-xl bg-zinc-100" />
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="displayName"
                  className="text-sm font-medium text-zinc-800"
                >
                  表示名
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setError(null);
                    setSuccess(false);
                  }}
                  maxLength={MAX_LENGTH}
                  placeholder="例：山田太郎"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
                />
                <p className="text-xs text-zinc-400">
                  {displayName.length}/{MAX_LENGTH}文字 · 1〜{MAX_LENGTH}文字で設定してください
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              {success && (
                <p className="text-sm text-emerald-600" role="status">
                  保存しました
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "保存中…" : "保存する"}
              </button>
            </form>
          )}
        </div>

        {/* Phase J: 投稿一覧 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">投稿一覧</h2>
          {fetching ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-zinc-100" />
          ) : myPosts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">まだ投稿はありません</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {myPosts.map((post) => {
                const isHidden = post.status === "hidden";
                return (
                  <li key={post.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isHidden ? (
                            <span className="text-sm font-medium text-zinc-400 line-through">
                              {post.title}
                            </span>
                          ) : (
                            <Link
                              href={`/posts/${post.id}`}
                              className="text-sm font-medium text-zinc-900 underline-offset-2 transition hover:text-zinc-600 hover:underline"
                            >
                              {post.title}
                            </Link>
                          )}
                          {isHidden && (
                            <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                              非表示
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <CategoryBadge category={post.category as CategorySlug} />
                          <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
                          <span>♥ {post.likes}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Phase K: 返信一覧 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">返信一覧</h2>
          {fetching ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-zinc-100" />
          ) : myReplies.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">まだ返信はありません</p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100">
              {myReplies.map((reply) => {
                const isHidden = reply.status === "hidden";
                const postTitle = reply.posts?.title ?? "（投稿が見つかりません）";
                return (
                  <li key={reply.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {reply.is_best_answer && (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          ベストアンサー
                        </span>
                      )}
                      {isHidden && (
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          非表示
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm ${isHidden ? "text-zinc-400 line-through" : "text-zinc-700"}`}>
                      {truncate(reply.description)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>
                        返信先：
                        <Link
                          href={`/posts/${reply.post_id}`}
                          className="underline-offset-2 transition hover:text-zinc-600 hover:underline"
                        >
                          {postTitle}
                        </Link>
                      </span>
                      <time dateTime={reply.created_at}>{formatDateTime(reply.created_at)}</time>
                      <span>♥ {reply.likes}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
