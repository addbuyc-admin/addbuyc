"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { getAdvisorRank } from "@/lib/advisor-rank";
import { AdvisorRankBadge } from "@/components/AdvisorRankBadge";
import { AvatarIcon } from "@/components/AvatarIcon";
import { PostStatusBadge } from "@/components/PostStatusBadge";

const REPLY_EXCERPT_LEN = 100;

function truncate(text: string, len = REPLY_EXCERPT_LEN): string {
  const single = text.replace(/\r?\n/g, " ");
  return single.length > len ? single.slice(0, len) + "…" : single;
}

type Profile = {
  id: string;
  display_name: string | null;
  username: string;
  avatar_url: string | null;
  created_at: string;
};

type Stats = {
  post_count: number;
  reply_count: number;
  total_reply_likes: number;
  best_answer_count: number;
};

type PublicReply = {
  id: number;
  description: string;
  created_at: string;
  post_id: number;
  posts: { id: number; title: string; status: string } | null;
};

type PublicPost = {
  id: number;
  title: string;
  created_at: string;
  hasBestAnswer: boolean;
};

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [replies, setReplies] = useState<PublicReply[]>([]);
  const [posts, setPosts] = useState<PublicPost[]>([]);

  useEffect(() => {
    if (!username) return;
    void (async () => {
      const profileRes = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, created_at")
        .eq("username", username)
        .maybeSingle();

      if (!profileRes.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const profileData = profileRes.data as Profile;
      setProfile(profileData);

      const [statsRes, repliesRes, postsRes] = await Promise.all([
        supabase
          .from("user_stats")
          .select("post_count, reply_count, total_reply_likes, best_answer_count")
          .eq("user_id", profileData.id)
          .maybeSingle(),
        supabase
          .from("replies")
          .select("id, description, created_at, post_id, posts(id, title, status)")
          .eq("user_id", profileData.id)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("posts")
          .select("id, title, created_at")
          .eq("user_id", profileData.id)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setStats(statsRes.data as Stats | null);

      const publishedReplies = ((repliesRes.data ?? []) as unknown as PublicReply[])
        .filter((r) => r.posts?.status === "published")
        .slice(0, 10);
      setReplies(publishedReplies);

      const postIdsArr = ((postsRes.data ?? []) as { id: number }[]).map((p) => p.id);
      let bestAnswerPostIds = new Set<number>();
      if (postIdsArr.length > 0) {
        const { data: baData } = await supabase
          .from("replies")
          .select("post_id")
          .in("post_id", postIdsArr)
          .eq("is_best_answer", true)
          .eq("status", "published");
        bestAnswerPostIds = new Set(
          ((baData ?? []) as { post_id: number }[]).map((r) => r.post_id),
        );
      }

      setPosts(
        ((postsRes.data ?? []) as { id: number; title: string; created_at: string }[]).map((p) => ({
          ...p,
          hasBestAnswer: bestAnswerPostIds.has(p.id),
        })),
      );
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-zinc-400">読み込み中…</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-zinc-500">ユーザーが見つかりません。</p>
      </div>
    );
  }

  const displayName = profile.display_name?.trim() || profile.username;
  const rank = stats ? getAdvisorRank(stats) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarIcon avatarUrl={profile.avatar_url} name={displayName} size={72} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {displayName}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500">@{profile.username}</p>
            </div>
          </div>
          {rank && <AdvisorRankBadge rank={rank} />}
        </div>
        <p className="text-xs text-zinc-400">
          登録日:{" "}
          {new Date(profile.created_at).toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            timeZone: "Asia/Tokyo",
          })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "投稿数", value: stats?.post_count ?? 0 },
          { label: "返信数", value: stats?.reply_count ?? 0 },
          { label: "返信いいね", value: stats?.total_reply_likes ?? 0 },
          { label: "ベストアンサー", value: stats?.best_answer_count ?? 0 },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-sm"
          >
            <p className="text-2xl font-semibold text-zinc-900">{value}</p>
            <p className="mt-1 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">最近の返信</h2>
        {replies.length === 0 ? (
          <p className="text-sm text-zinc-400">まだ返信はありません。</p>
        ) : (
          <ul className="space-y-3">
            {replies.map((reply) => (
              <li
                key={reply.id}
                className="space-y-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                {reply.posts && (
                  <Link
                    href={`/posts/${reply.post_id}`}
                    className="line-clamp-1 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
                  >
                    {reply.posts.title}
                  </Link>
                )}
                <p className="text-sm text-zinc-700">{truncate(reply.description)}</p>
                <time
                  className="block text-xs text-zinc-400"
                  dateTime={reply.created_at}
                >
                  {formatDateTime(reply.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">最近の投稿</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-zinc-400">まだ投稿はありません。</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <PostStatusBadge hasBestAnswer={post.hasBestAnswer} />
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-sm font-medium text-zinc-800 underline-offset-2 hover:text-zinc-600 hover:underline"
                  >
                    {post.title}
                  </Link>
                </div>
                <time
                  className="mt-1 block text-xs text-zinc-400"
                  dateTime={post.created_at}
                >
                  {formatDateTime(post.created_at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
