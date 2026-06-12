"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

const EXCERPT_LEN = 120;

function truncate(text: string): string {
  const single = text.replace(/\r?\n/g, " ");
  return single.length > EXCERPT_LEN ? single.slice(0, EXCERPT_LEN) + "…" : single;
}

type PublicReply = {
  id: number;
  description: string;
  created_at: string;
  is_best_answer: boolean;
  post_id: number;
  posts: { id: number; title: string; status: string } | null;
};

export default function UserRepliesPage() {
  const params = useParams();
  const username = params.username as string;

  const [pageDisplayName, setPageDisplayName] = useState<string | null>(null);
  const [replies, setReplies] = useState<PublicReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    void (async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .eq("username", username)
        .maybeSingle();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const profile = profileData as { id: string; display_name: string | null; username: string };
      setPageDisplayName(profile.display_name?.trim() || profile.username);

      // Step 1: 公開返信を取得（posts JOIN を避けて INNER JOIN による欠落を防ぐ）
      const { data: repliesData } = await supabase
        .from("replies")
        .select("id, description, created_at, is_best_answer, post_id")
        .eq("user_id", profile.id)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      const fetchedReplies = (repliesData ?? []) as {
        id: number;
        description: string;
        created_at: string;
        is_best_answer: boolean;
        post_id: number;
      }[];

      // Step 2: 一意の post_id に対して公開投稿のタイトルを取得
      const uniquePostIds = [...new Set(fetchedReplies.map((r) => r.post_id))];
      const postMap = new Map<number, { title: string; status: string }>();
      if (uniquePostIds.length > 0) {
        const { data: postsData } = await supabase
          .from("posts")
          .select("id, title, status")
          .in("id", uniquePostIds);
        for (const p of (postsData ?? []) as { id: number; title: string; status: string }[]) {
          postMap.set(p.id, { title: p.title, status: p.status });
        }
      }

      // Step 3: 親投稿が published のものだけ表示（取得できないものは除外）
      const visible: PublicReply[] = fetchedReplies
        .filter((r) => {
          const p = postMap.get(r.post_id);
          return p?.status === "published";
        })
        .map((r) => {
          const p = postMap.get(r.post_id);
          return {
            ...r,
            posts: p ? { id: r.post_id, title: p.title, status: p.status } : null,
          };
        });
      setReplies(visible);
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-stone-500">ユーザーが見つかりません。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/users/${username}`}
        className="text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        ← プロフィールに戻る
      </Link>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {pageDisplayName}さんの返信
        </h1>
        <p className="mt-1 text-sm text-stone-400">{replies.length}件</p>
      </div>

      {replies.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-8 py-16 text-center">
          <p className="text-sm text-stone-500">まだ返信はありません</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-stone-100">
          {replies.map((reply) => {
            const postTitle = reply.posts?.title ?? "（投稿タイトルなし）";
            return (
              <li key={reply.id}>
                <Link
                  href={`/posts/${reply.post_id}#reply-${reply.id}`}
                  className="block py-4 transition hover:opacity-75"
                >
                  {reply.is_best_answer && (
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      ベストアンサー
                    </span>
                  )}
                  <p className="mt-1 text-sm leading-relaxed text-stone-700">
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
