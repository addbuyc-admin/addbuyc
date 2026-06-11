"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { getAdvisorRank } from "@/lib/advisor-rank";
import { AdvisorRankBadge } from "@/components/AdvisorRankBadge";
import { AvatarIcon } from "@/components/AvatarIcon";
import { PostStatusBadge } from "@/components/PostStatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import type { CategorySlug } from "@/lib/categories";

const REPLY_EXCERPT_LEN = 100;

function truncate(text: string, len = REPLY_EXCERPT_LEN): string {
  const single = text.replace(/\r?\n/g, " ");
  return single.length > len ? single.slice(0, len) + "…" : single;
}

type FollowUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

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
  category: string;
  hasBestAnswer: boolean;
};

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const { user: currentUser, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [replies, setReplies] = useState<PublicReply[]>([]);
  const [posts, setPosts] = useState<PublicPost[]>([]);

  // フォロー関連
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<FollowUser[]>([]);
  const [followingList, setFollowingList] = useState<FollowUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  // 追加カウント
  const [followedPostCount, setFollowedPostCount] = useState(0);
  const [ownPostLikeSum, setOwnPostLikeSum] = useState(0);

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

      const [statsRes, repliesRes, postsRes, followerRes, followingRes, followedPostCountRes, allPostLikesRes] = await Promise.all([
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
          .limit(10),
        supabase
          .from("posts")
          .select("id, title, created_at, category")
          .eq("user_id", profileData.id)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileData.id),
        supabase
          .from("user_follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileData.id),
        supabase
          .from("post_follows")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profileData.id),
        supabase
          .from("posts")
          .select("likes")
          .eq("user_id", profileData.id)
          .eq("status", "published"),
      ]);

      setFollowerCount(followerRes.count ?? 0);
      setFollowingCount(followingRes.count ?? 0);
      setFollowedPostCount(followedPostCountRes.count ?? 0);
      setOwnPostLikeSum(
        ((allPostLikesRes.data ?? []) as { likes: number | null }[])
          .reduce((sum, p) => sum + (p.likes ?? 0), 0),
      );

      setStats(statsRes.data as Stats | null);

      const publishedReplies = ((repliesRes.data ?? []) as unknown as PublicReply[])
        .filter((r) => r.posts?.status === "published");
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
        ((postsRes.data ?? []) as { id: number; title: string; created_at: string; category: string }[]).map((p) => ({
          ...p,
          hasBestAnswer: bestAnswerPostIds.has(p.id),
        })),
      );
      setLoading(false);
    })();
  }, [username]);

  // ログイン状態が確定したらフォロー済みかチェック
  useEffect(() => {
    if (authLoading || !profile || !currentUser || currentUser.id === profile.id) return;
    void (async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", profile.id)
        .maybeSingle();
      setIsFollowing(!!data);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, currentUser?.id, profile?.id]);

  async function handleFollow() {
    if (!currentUser || !profile || followLoading) return;
    setFollowLoading(true);
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_id: currentUser.id, following_id: profile.id });
    if (!error) {
      setIsFollowing(true);
      setFollowerCount((n) => n + 1);
    }
    setFollowLoading(false);
  }

  async function handleUnfollowProfile() {
    if (!currentUser || !profile || followLoading) return;
    setFollowLoading(true);
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_id", currentUser.id)
      .eq("following_id", profile.id);
    if (!error) {
      setIsFollowing(false);
      setFollowerCount((n) => Math.max(0, n - 1));
    }
    setFollowLoading(false);
  }

  async function handleOpenFollowers() {
    setShowFollowersModal(true);
    setFollowListLoading(true);
    if (!profile) return;
    const { data: rows } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = (rows ?? []).map((r) => r.follower_id);
    if (ids.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      setFollowersList((profilesData ?? []) as FollowUser[]);
    } else {
      setFollowersList([]);
    }
    setFollowListLoading(false);
  }

  async function handleOpenFollowing() {
    setShowFollowingModal(true);
    setFollowListLoading(true);
    if (!profile) return;
    const { data: rows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = (rows ?? []).map((r) => r.following_id);
    if (ids.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      setFollowingList((profilesData ?? []) as FollowUser[]);
    } else {
      setFollowingList([]);
    }
    setFollowListLoading(false);
  }

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
    <>
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">

      {/* ① プロフィールセクション */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-zinc-900">プロフィール</h2>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarIcon avatarUrl={profile.avatar_url} name={displayName} size={72} />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{displayName}</h1>
              <p className="mt-0.5 text-sm text-zinc-500">@{profile.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rank && <AdvisorRankBadge rank={rank} />}
            {!authLoading && currentUser && currentUser.id !== profile.id && (
              isFollowing ? (
                <button type="button" onClick={handleUnfollowProfile} disabled={followLoading} className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">フォロー解除</button>
              ) : (
                <button type="button" onClick={handleFollow} disabled={followLoading} className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-50">フォローする</button>
              )
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          登録日：{new Date(profile.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", timeZone: "Asia/Tokyo" })}
        </p>
        <div className="mt-3 flex items-center gap-6">
          <button type="button" onClick={handleOpenFollowers} className="group text-left">
            <span className="text-base font-semibold text-zinc-900">{followerCount}</span>
            <span className="ml-1.5 text-sm text-zinc-500 group-hover:text-zinc-700">フォロワー</span>
          </button>
          <button type="button" onClick={handleOpenFollowing} className="group text-left">
            <span className="text-base font-semibold text-zinc-900">{followingCount}</span>
            <span className="ml-1.5 text-sm text-zinc-500 group-hover:text-zinc-700">フォロー中</span>
          </button>
        </div>
      </div>

      {/* ② 自分から */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900">自分から</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(
            [
              { label: "フォロー", value: followingCount, href: `/users/${profile.username}/following` },
              { label: "返信", value: stats?.reply_count ?? 0 },
              { label: "投稿フォロー", value: followedPostCount },
              { label: "いいね", value: null },
              { label: "おなじ気持ち", value: null },
              { label: "ベストアンサー", value: null },
            ] as Array<{ label: string; value: number | null; href?: string }>
          ).map(({ label, value, href }) => {
            const cardClass = "rounded-xl border border-zinc-100 bg-zinc-50 px-2 py-3 text-center";
            const inner = (
              <>
                <p className="text-xl font-semibold text-zinc-900">{value !== null ? value : "—"}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
              </>
            );
            return href ? (
              <Link key={label} href={href} className={`${cardClass} block transition hover:bg-zinc-100`}>{inner}</Link>
            ) : (
              <div key={label} className={cardClass}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* ③ 相手から */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900">相手から</h2>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {(
            [
              { label: "フォロワー", value: followerCount, href: `/users/${profile.username}/followers` },
              { label: "返信", value: null },
              { label: "投稿フォロー", value: null },
              { label: "いいね", value: stats?.total_reply_likes ?? 0 },
              { label: "おなじ気持ち", value: ownPostLikeSum },
              { label: "ベストアンサー", value: stats?.best_answer_count ?? 0 },
            ] as Array<{ label: string; value: number | null; href?: string }>
          ).map(({ label, value, href }) => {
            const cardClass = "rounded-xl border border-zinc-100 bg-zinc-50 px-2 py-3 text-center";
            const inner = (
              <>
                <p className="text-xl font-semibold text-zinc-900">{value !== null ? value : "—"}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
              </>
            );
            return href ? (
              <Link key={label} href={href} className={`${cardClass} block transition hover:bg-zinc-100`}>{inner}</Link>
            ) : (
              <div key={label} className={cardClass}>{inner}</div>
            );
          })}
        </div>
        <div className="mt-4">
          <Link href="/advisor-ranks" className="text-xs text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline">アドバイザーランクについて</Link>
        </div>
      </div>

      {/* ④ 最近の投稿 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">最近の投稿</h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">まだ投稿はありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {posts.slice(0, 5).map((post) => (
              <li key={post.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PostStatusBadge hasBestAnswer={post.hasBestAnswer} />
                  <Link href={`/posts/${post.id}`} className="text-sm font-medium text-zinc-900 underline-offset-2 transition hover:text-zinc-600 hover:underline">{post.title}</Link>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <CategoryBadge category={post.category as CategorySlug} />
                  <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ⑤ 最近の返信 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">最近の返信</h2>
        {replies.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">まだ返信はありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100">
            {replies.slice(0, 5).map((reply) => (
              <li key={reply.id} className="py-3">
                {reply.posts && (
                  <Link href={`/posts/${reply.post_id}`} className="line-clamp-1 text-xs text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline">{reply.posts.title}</Link>
                )}
                <p className="mt-0.5 text-sm text-zinc-700">{truncate(reply.description)}</p>
                <time className="mt-1 block text-xs text-zinc-400" dateTime={reply.created_at}>{formatDateTime(reply.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
    {/* フォロワーモーダル */}
    {showFollowersModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => { setShowFollowersModal(false); setFollowersList([]); }}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">フォロワー</h2>
            <button
              type="button"
              onClick={() => { setShowFollowersModal(false); setFollowersList([]); }}
              className="text-sm text-zinc-400 transition hover:text-zinc-700"
            >
              ✕
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
            {followListLoading ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">読み込み中…</li>
            ) : followersList.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">フォロワーはいません</li>
            ) : followersList.map((u) => (
              <li key={u.id}>
                <Link
                  href={u.username ? `/users/${u.username}` : "#"}
                  onClick={() => { setShowFollowersModal(false); setFollowersList([]); }}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-zinc-50"
                >
                  <AvatarIcon avatarUrl={u.avatar_url} name={u.display_name ?? u.username ?? "?"} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{u.display_name ?? u.username ?? "—"}</p>
                    {u.username && <p className="text-xs text-zinc-500">@{u.username}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
    {/* フォロー中モーダル */}
    {showFollowingModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => { setShowFollowingModal(false); setFollowingList([]); }}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">フォロー中</h2>
            <button
              type="button"
              onClick={() => { setShowFollowingModal(false); setFollowingList([]); }}
              className="text-sm text-zinc-400 transition hover:text-zinc-700"
            >
              ✕
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
            {followListLoading ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">読み込み中…</li>
            ) : followingList.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">フォロー中のユーザーはいません</li>
            ) : followingList.map((u) => (
              <li key={u.id}>
                <Link
                  href={u.username ? `/users/${u.username}` : "#"}
                  onClick={() => { setShowFollowingModal(false); setFollowingList([]); }}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-zinc-50"
                >
                  <AvatarIcon avatarUrl={u.avatar_url} name={u.display_name ?? u.username ?? "?"} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{u.display_name ?? u.username ?? "—"}</p>
                    {u.username && <p className="text-xs text-zinc-500">@{u.username}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
    </>
  );
}
