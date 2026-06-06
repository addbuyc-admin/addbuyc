"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

function toErrorMessage(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "メールアドレスまたはパスワードが正しくありません";
  if (msg.includes("Email not confirmed"))
    return "メールアドレスの確認が完了していません。確認メールをご確認ください";
  if (msg.includes("Password should be at least"))
    return "パスワードは6文字以上で入力してください";
  return "サインインに失敗しました。しばらくしてから再度お試しください";
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(toErrorMessage(error.message));
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          サインイン
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          アカウントにサインインしてください
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        autoComplete="on"
        className="flex flex-col gap-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-zinc-800">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            name="email"
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
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
          />
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
          {loading ? "サインイン中…" : "サインイン"}
        </button>

        <p className="text-center text-sm text-zinc-500">
          アカウントをお持ちでない方は{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
          >
            サインアップ
          </Link>
        </p>
      </form>
    </div>
  );
}
