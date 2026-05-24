"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const MAX_DISPLAY_NAME = 20;

function normalizeUsername(value: string): string {
  return value.toLowerCase().trim();
}

function validateDisplayName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "名前を入力してください";
  if (trimmed.length > MAX_DISPLAY_NAME) return `${MAX_DISPLAY_NAME}文字以内で入力してください`;
  return null;
}

function validateUsername(value: string): string | null {
  if (!value) return "ユーザー名を入力してください";
  if (!USERNAME_REGEX.test(value))
    return "3〜20文字・英小文字/数字/アンダースコアのみ使用できます";
  return null;
}

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
  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit"))
    return "メール送信の上限に達しました。しばらく時間をおいてから再度お試しください";
  return "サインアップに失敗しました。しばらくしてから再度お試しください";
}

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUsername(normalizeUsername(e.target.value));
    setUsernameError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDisplayNameError(null);
    setUsernameError(null);

    const trimmedDisplayName = displayName.trim();
    const normalizedUsername = normalizeUsername(username);

    const displayNameErr = validateDisplayName(trimmedDisplayName);
    if (displayNameErr) {
      setDisplayNameError(displayNameErr);
      return;
    }

    const usernameErr = validateUsername(normalizedUsername);
    if (usernameErr) {
      setUsernameError(usernameErr);
      return;
    }

    setLoading(true);

    // username 重複チェック
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (existing) {
      setUsernameError("このユーザー名はすでに使用されています");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          username: normalizedUsername,
          display_name: trimmedDisplayName,
        },
      },
    });

    if (error) {
      setError(toErrorMessage(error.message));
      setLoading(false);
      return;
    }

    // email confirm OFF（現状）: セッションが即時発行される
    if (data.session && data.user) {
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          username: normalizedUsername,
          display_name: trimmedDisplayName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      router.push("/");
      router.refresh();
      return;
    }

    // email confirm ON（将来）: メール送信後に待機画面へ
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
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
          <label htmlFor="displayName" className="text-sm font-medium text-zinc-800">
            名前
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDisplayNameError(null);
            }}
            required
            autoComplete="name"
            placeholder="例：山田太郎"
            className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:ring-2 ${
              displayNameError
                ? "border-red-300 focus:border-red-400"
                : "border-zinc-200 focus:border-zinc-300"
            }`}
          />
          {displayNameError ? (
            <p className="text-xs text-red-600" role="alert">{displayNameError}</p>
          ) : (
            <p className="text-xs text-zinc-400">
              {displayName.trim().length}/{MAX_DISPLAY_NAME}文字
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium text-zinc-800">
            ユーザー名
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={handleUsernameChange}
            required
            autoComplete="username"
            placeholder="例：taro_yamada"
            className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:ring-2 ${
              usernameError
                ? "border-red-300 focus:border-red-400"
                : "border-zinc-200 focus:border-zinc-300"
            }`}
          />
          {usernameError ? (
            <p className="text-xs text-red-600" role="alert">{usernameError}</p>
          ) : (
            <p className="text-xs text-zinc-400">
              3〜20文字・英小文字 / 数字 / アンダースコアのみ
            </p>
          )}
        </div>

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
          <label htmlFor="password" className="text-sm font-medium text-zinc-800">
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
