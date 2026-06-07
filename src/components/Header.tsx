"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/browser";
import { NotificationBell } from "@/components/NotificationBell";
import { AvatarIcon } from "@/components/AvatarIcon";

export function Header() {
  const { user, loading, displayName, avatarUrl, isAdmin } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!menuOpen) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
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
          {/* Home アイコン */}
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

          {/* Dashboard アイコン（admin のみ） */}
          {!loading && user && isAdmin && (
            <Link
              href="/dashboard"
              aria-label="Dashboard"
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
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </Link>
          )}

          {!loading && (
            user ? (
              <>
                {/* 通知ベル */}
                <NotificationBell userId={user.id} />

                {/* アバターメニュー */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="メニューを開く"
                    className="flex items-center rounded-full ring-offset-1 transition hover:ring-2 hover:ring-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    <AvatarIcon
                      avatarUrl={avatarUrl}
                      name={displayName ?? user.email ?? "?"}
                      size={30}
                    />
                  </button>

                  {menuOpen && (
                    <div className="fixed left-4 right-4 top-16 z-50 rounded-2xl border border-zinc-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-44">
                      <ul className="py-1.5">
                        <li>
                          <Link
                            href="/mypage"
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center px-4 py-2.5 text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
                          >
                            マイページ
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/new"
                            onClick={() => setMenuOpen(false)}
                            className="flex w-full items-center px-4 py-2.5 text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
                          >
                            投稿する
                          </Link>
                        </li>
                        <li className="mx-3 my-1 border-t border-zinc-100" />
                        <li>
                          <button
                            type="button"
                            onClick={handleSignOut}
                            className="flex w-full items-center px-4 py-2.5 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700"
                          >
                            サインアウト
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="text-sm font-medium text-zinc-600 transition hover:text-zinc-900"
                >
                  サインイン
                </Link>
                <Link
                  href="/new"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                >
                  New post
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
