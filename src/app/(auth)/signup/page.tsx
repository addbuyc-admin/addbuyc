"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

function toErrorMessage(msg: string): string {
  if (
    msg.includes("User already registered") ||
    msg.includes("already been registered")
  )
    return "このメールアドレスはすでに登録されています";
  if (msg.includes("Password should be at least"))
    return "パスワードは6文字以上で入力してください";
  if (msg.includes("Unable to validate email address"))
    return "有効なメールアドレスを入力してください";
  return "サインアップに失敗しました。しばらくしてから再度お試しください";
}

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(toErrorMessage(error.message));
      setLoading(false);
      return;
    }

    // メール確認不要の設定の場合はセッションが即時発行される
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    // メール確認が必要な場合
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          <p className="text-lg font-semibold text-zinc-900">
            確認メールを送信しました
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            {email}{" "}
            に確認メールを送りました。メール内のリンクをクリックしてサインインを完了してください。
          </p>
          <Link
            href="/signin"
            className="mt-6 inline-block rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
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
          サインアップ
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          新しいアカウントを作成してください
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-zinc-800">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-zinc-800"
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
          />
          <p className="text-xs text-zinc-400">6文字以上で入力してください</p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "作成中…" : "アカウントを作成"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          すでにアカウントをお持ちの方は{" "}
          <Link
            href="/signin"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            サインイン
          </Link>
        </p>
      </form>
    </div>
  );
}
