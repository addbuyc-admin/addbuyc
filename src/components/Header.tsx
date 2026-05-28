"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/browser";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const { user, loading, displayName } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 transition hover:text-zinc-600"
        >
          AddBuy<span className="text-zinc-500">+</span>C
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Home"
            className="text-zinc-600 transition hover:text-zinc-900"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          {!loading &&
            (user ? (
              <>
                <NotificationBell userId={user.id} />
                <Link
                  href="/mypage"
                  className="max-w-[100px] truncate text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                >
                  {displayName ?? "マイページ"}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
                >
                  サインアウト
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
              >
                サインイン
              </Link>
            ))}
          <Link
            href="/new"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            New post
          </Link>
        </nav>
      </div>
    </header>
  );
}
