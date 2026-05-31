"use client";

import Link from "next/link";

type LoginPromptProps = {
  message: string;
  description?: string;
};

export function LoginPrompt({ message, description }: LoginPromptProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 px-6 py-8 text-center">
      <p className="font-semibold text-zinc-800">{message}</p>
      {description && (
        <p className="mt-1.5 text-sm text-zinc-500">{description}</p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signin"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          ログインする
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
        >
          アカウントを作成する
        </Link>
      </div>
    </div>
  );
}
