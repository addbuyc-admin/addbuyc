"use client";

import Link from "next/link";

type LoginPromptProps = {
  message: string;
  description?: string;
};

export function LoginPrompt({ message, description }: LoginPromptProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-6 py-8 text-center">
      <p className="font-semibold text-stone-800">{message}</p>
      {description && (
        <p className="mt-1.5 text-sm text-stone-500">{description}</p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/signin"
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
        >
          ログインする
        </Link>
        <Link
          href="/signup"
          className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
        >
          アカウントを作成する
        </Link>
      </div>
    </div>
  );
}
