"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

const EXCERPT_LEN = 120;

function truncate(text: string): string {
  const single = text.replace(/\r?\n/g, " ");
  return single.length > EXCERPT_LEN ? single.slice(0, EXCERPT_LEN) + "…" : single;
}

type MyReply = {
  id: number;
  description: string;
  created_at: string;
  is_best_answer: boolean;
  status: string;
  post_id: number;
  posts: { id: number; title: string } | null;
};

export default function MyPageRepliesPage() {
  const { user, loading: authLoading } = useAuth();
  const [replies, setReplies] = useState<MyReply[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    void (async () => {
      // Step 1: posts JOIN を避けて返信を全件取得（INNER JOIN で落ちるのを防ぐ）
      const { data: repliesData } = await supabase
        .from("replies")
        .select("id, description, created_at, is_best_answer, status, post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const fetchedReplies = (repliesData ?? []) as {
        id: number;
        description: string;
        created_at: string;
        is_best_answer: boolean;
        status: string;
        post_id: number;
      }[];

      // Step 2: 一意の post_id に対して投稿タイトルを取得（取得できない投稿は null で扱う）
      const uniquePostIds = [...new Set(fetchedReplies.map((r) => r.post_id))];
      const postTitleMap = new Map<number, string>();
      if (uniquePostIds.length > 0) {
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, title")
          .in("id", uniquePostIds);
        for (const p of (postsData ?? []) as { id: number; title: string }[]) {
          postTitleMap.set(p.id, p.title);
        }
      }

      // Step 3: マージ（投稿タイトルが取れない返信も必ず残す）
      const merged: MyReply[] = fetchedReplies.map((r) => ({
        ...r,
        posts: postTitleMap.has(r.post_id)
          ? { id: r.post_id, title: postTitleMap.get(r.post_id)! }
          : null,
      }));

      setReplies(merged);
      setFetching(false);
    })();
  }, [user, authLoading]);

  if (authLoading || fetching) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-sm text-stone-600">このページを見るにはサインインが必要です。</p>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
        >
          サインインへ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/mypage" className="text-sm font-medium text-stone-500 transition hover:text-stone-900">
        ← プロフィールに戻る
      </Link>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">返信</h1>
        <p className="mt-1 text-sm text-stone-400">{replies.length}件</p>
      </div>

      {replies.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-8 py-16 text-center">
          <p className="text-sm text-stone-500">まだ返信はありません</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-stone-100">
          {replies.map((reply) => {
            const isHidden = reply.status === "hidden";
            const postTitle = reply.posts?.title ?? "（投稿タイトルなし）";
            return (
              <li key={reply.id}>
                <Link
                  href={`/posts/${reply.post_id}#reply-${reply.id}`}
                  className="block py-4 transition hover:opacity-75"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {reply.is_best_answer && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        ベストアンサー
                      </span>
                    )}
                    {isHidden && (
                      <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                        非表示
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-sm leading-relaxed ${isHidden ? "text-stone-400 line-through" : "text-stone-700"}`}>
                    {truncate(reply.description)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-stone-400">
                    <span>
                      返信先：<span className="text-stone-500">{postTitle}</span>
                    </span>
                    <time dateTime={reply.created_at}>{formatDateTime(reply.created_at)}</time>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
