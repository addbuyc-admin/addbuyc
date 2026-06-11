"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { AvatarIcon } from "@/components/AvatarIcon";

type FollowUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default function MyPageFollowersPage() {
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    void (async () => {
      const { data: followRows } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (followRows ?? []).map((r) => r.follower_id as string);
      if (ids.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        const ordered = ids
          .map((id) => (profilesData ?? []).find((p) => p.id === id))
          .filter((p): p is FollowUser => p != null);
        setUsers(ordered);
      }
      setFetching(false);
    })();
  }, [user, authLoading]);

  if (authLoading || fetching) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-sm text-zinc-600">このページを見るにはサインインが必要です。</p>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          サインインへ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/mypage" className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
        ← プロフィールに戻る
      </Link>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">フォロワー</h1>
        <p className="mt-1 text-sm text-zinc-400">{users.length}人</p>
      </div>

      {users.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          <p className="text-sm text-zinc-500">フォロワーはいません</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-100">
          {users.map((u) => {
            const href = u.id === user.id ? "/mypage" : (u.username ? `/users/${u.username}` : "#");
            return (
              <li key={u.id}>
                <Link href={href} className="flex items-center gap-3 py-4 transition hover:opacity-80">
                  <AvatarIcon
                    avatarUrl={u.avatar_url}
                    name={u.display_name ?? u.username ?? "?"}
                    size={44}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {u.display_name ?? u.username ?? "—"}
                    </p>
                    {u.username && (
                      <p className="text-xs text-zinc-500">@{u.username}</p>
                    )}
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
