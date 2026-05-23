"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/browser";

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
            className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
          >
            Home
          </Link>
          {!loading &&
            (user ? (
              <>
                <Link
                  href="/mypage"
                  className="max-w-[100px] truncate text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-900 hover:underline"
                  title={user.email ?? undefined}
                >
                  {displayName || user.email?.split("@")[0]}
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
