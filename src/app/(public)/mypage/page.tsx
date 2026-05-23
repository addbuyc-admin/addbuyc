"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";

const MAX_LENGTH = 20;

export default function MyPage() {
  const { user, loading, refreshDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      setDisplayName(data?.display_name ?? "");
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
      <div className="mx-auto max-w-sm px-4 py-16">
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

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          マイページ
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
      </div>

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
    </div>
  );
}
