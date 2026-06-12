"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

export default function UserFollowersPage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser } = useAuth();

  const [pageDisplayName, setPageDisplayName] = useState<string | null>(null);
  const [users, setUsers] = useState<FollowUser[]>([]);
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

      const { data: followRows } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", profile.id)
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
          {pageDisplayName}さんのフォロワー
        </h1>
        <p className="mt-1 text-sm text-stone-400">{users.length}人</p>
      </div>

      {users.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-8 py-16 text-center">
          <p className="text-sm text-stone-500">フォロワーはいません</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-stone-100">
          {users.map((u) => {
            const href = currentUser && u.id === currentUser.id
              ? "/mypage"
              : (u.username ? `/users/${u.username}` : "#");
            return (
              <li key={u.id}>
                <Link href={href} className="flex items-center gap-3 py-4 transition hover:opacity-80">
                  <AvatarIcon
                    avatarUrl={u.avatar_url}
                    name={u.display_name ?? u.username ?? "?"}
                    size={44}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-stone-900">
                      {u.display_name ?? u.username ?? "—"}
                    </p>
                    {u.username && (
                      <p className="text-xs text-stone-500">@{u.username}</p>
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
