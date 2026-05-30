"use client";

import Link from "next/link";
import { Suspense } from "react";
import { formatDateTime } from "@/lib/format";
import { useRouter, useSearchParams } from "next/navigation";
import { usePosts } from "@/context/PostsProvider";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PostStatusBadge } from "@/components/PostStatusBadge";
import { CATEGORIES } from "@/lib/categories";
import type { CategorySlug } from "@/lib/categories";

function isValidCategory(value: string | null): value is CategorySlug {
  return CATEGORIES.some((c) => c.slug === value);
}

function buildHref(params: {
  category?: string | null;
  q?: string;
  status?: "open" | "resolved" | null;
  sort?: "likes" | null;
}) {
  const p = new URLSearchParams();
  if (params.category) p.set("category", params.category);
  if (params.q) p.set("q", params.q);
  if (params.status) p.set("status", params.status);
  if (params.sort) p.set("sort", params.sort);
  const qs = p.toString();
  return qs ? `/posts?${qs}` : "/posts";
}

const STATUS_OPTIONS = [
  { value: null, label: "すべて" },
  { value: "open", label: "相談中" },
  { value: "resolved", label: "解決済み" },
] as const;

const SORT_OPTIONS = [
  { value: null, label: "新着順" },
  { value: "likes", label: "Like順" },
] as const;

function PostListWithFilter() {
  const { posts, ready } = usePosts();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCategory = searchParams.get("category");
  const activeCategory: CategorySlug | null = isValidCategory(rawCategory) ? rawCategory : null;
  const q = searchParams.get("q")?.trim() ?? "";
  const rawStatus = searchParams.get("status");
  const activeStatus: "open" | "resolved" | null =
    rawStatus === "open" ? "open" : rawStatus === "resolved" ? "resolved" : null;
  const rawSort = searchParams.get("sort");
  const activeSort: "likes" | null = rawSort === "likes" ? "likes" : null;

  const hasFilter = !!(q || activeCategory || activeStatus);

  const filtered = posts
    .filter((p) => !activeCategory || p.category === activeCategory)
    .filter((p) => {
      if (!q) return true;
      const lower = q.toLowerCase();
      return (
        p.title.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
      );
    })
    .filter((p) => {
      if (!activeStatus) return true;
      return activeStatus === "open" ? !p.hasBestAnswer : p.hasBestAnswer;
    });

  const sorted = [...filtered].sort((a, b) => {
    if (activeSort === "likes") return b.likes - a.likes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newQ = (new FormData(e.currentTarget).get("search") as string)?.trim() ?? "";
    router.push(buildHref({ category: activeCategory, q: newQ, status: activeStatus, sort: activeSort }));
  }

  return (
    <>
      {/* キーワード検索 */}
      <form key={q} onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          name="search"
          type="text"
          defaultValue={q}
          placeholder="タイトル・本文で検索…"
          className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-900/10"
        />
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          検索
        </button>
        {q && (
          <Link
            href={buildHref({ category: activeCategory, status: activeStatus, sort: activeSort })}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            クリア
          </Link>
        )}
      </form>

      {/* カテゴリ絞り込み（横スクロール） */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max gap-2 pb-1">
          <Link
            href={buildHref({ q, status: activeStatus, sort: activeSort })}
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition ${
              !activeCategory
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            すべて
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={buildHref({ category: cat.slug, q, status: activeStatus, sort: activeSort })}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition ${
                activeCategory === cat.slug
                  ? "bg-zinc-900 text-white"
                  : `${cat.badgeClassName} hover:opacity-80`
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ステータス・並び順 */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-zinc-500">ステータス</span>
          <div className="flex gap-1">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <Link
                key={label}
                href={buildHref({ category: activeCategory, q, status: value, sort: activeSort })}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeStatus === value
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-zinc-500">並び順</span>
          <div className="flex gap-1">
            {SORT_OPTIONS.map(({ value, label }) => (
              <Link
                key={label}
                href={buildHref({ category: activeCategory, q, status: activeStatus, sort: value })}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeSort === value
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* 投稿一覧 */}
      {!ready ? (
        <ul className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </ul>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          {hasFilter ? (
            <>
              <p className="text-zinc-600">該当する相談はありません。</p>
              <Link
                href="/posts"
                className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                絞り込みをクリア
              </Link>
            </>
          ) : (
            <>
              <p className="text-zinc-600">まだ投稿がありません。</p>
              <Link
                href="/new"
                className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                最初の相談を投稿する
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md sm:px-5"
            >
              <div className="flex items-center gap-3">
                {(post.imageUrls?.[0] ?? post.imageUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(post.imageUrls?.[0] ?? post.imageUrl)!}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <Link
                    href={`/posts/${post.id}`}
                    className="text-base font-semibold tracking-tight text-zinc-900 underline-offset-4 hover:underline"
                  >
                    {post.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                    <CategoryBadge category={post.category} />
                    <PostStatusBadge hasBestAnswer={post.hasBestAnswer} />
                    <time dateTime={post.createdAt}>
                      {formatDateTime(post.createdAt)}
                    </time>
                    <span className="inline-flex items-center gap-1 text-zinc-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                      {post.likes}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PostsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Community
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            みんなの相談
          </h1>
          <p className="mt-2 max-w-md text-[15px] text-zinc-500">
            カテゴリやキーワードで気になる相談を探せます。
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          相談を投稿する
        </Link>
      </div>

      <Suspense
        fallback={
          <ul className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <li key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
            ))}
          </ul>
        }
      >
        <PostListWithFilter />
      </Suspense>
    </div>
  );
}
