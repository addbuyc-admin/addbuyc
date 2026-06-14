"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";

function ComingSoonBadge() {
  return (
    <span className="shrink-0 inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-400">
      準備中
    </span>
  );
}

export default function SettingsPage() {
  const { user, loading: authLoading, displayName } = useAuth();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      setUsername((data as { username: string | null } | null)?.username ?? null);
    })();
  }, [user]);

  if (authLoading) {
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
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">設定</h1>
        <p className="mt-1.5 text-sm text-stone-500">
          アカウント情報やプロフィール関連の設定を管理できます。
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {/* アカウント情報 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">アカウント情報</h2>
          <div className="rounded-2xl border border-stone-200 bg-white shadow-md">
            <ul className="divide-y divide-stone-100">
              {/* メールアドレス */}
              <li className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-500">メールアドレス</p>
                  <p className="mt-0.5 truncate text-sm text-stone-900">{user.email}</p>
                </div>
                <ComingSoonBadge />
              </li>
              {/* パスワード */}
              <li className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-500">パスワード</p>
                  <p className="mt-0.5 text-sm tracking-widest text-stone-900">••••••••</p>
                </div>
                <ComingSoonBadge />
              </li>
            </ul>
          </div>
        </section>

        {/* プロフィール */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-stone-700">プロフィール</h2>
          <div className="rounded-2xl border border-stone-200 bg-white shadow-md">
            <ul className="divide-y divide-stone-100">
              {/* 表示名 */}
              <li className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-500">表示名</p>
                  <p className="mt-0.5 text-sm text-stone-900">{displayName ?? "—"}</p>
                </div>
                <Link
                  href="/mypage"
                  className="shrink-0 text-xs font-medium text-amber-700 underline-offset-2 transition hover:text-amber-600 hover:underline"
                >
                  編集する
                </Link>
              </li>
              {/* ユーザー名 */}
              <li className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-500">ユーザー名</p>
                  <p className="mt-0.5 text-sm text-stone-900">
                    {username ? `@${username}` : "—"}
                  </p>
                </div>
                <ComingSoonBadge />
              </li>
              {/* アバター */}
              <li className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-stone-500">プロフィール画像</p>
                  <p className="mt-0.5 text-xs text-stone-400">マイページから変更できます</p>
                </div>
                <Link
                  href="/mypage"
                  className="shrink-0 text-xs font-medium text-amber-700 underline-offset-2 transition hover:text-amber-600 hover:underline"
                >
                  編集する
                </Link>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
