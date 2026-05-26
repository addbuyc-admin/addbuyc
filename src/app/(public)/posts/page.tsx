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

function buildHref(params: { category?: string | null; q?: string }) {
  const p = new URLSearchParams();
  if (params.category) p.set("category", params.category);
  if (params.q) p.set("q", params.q);
  const qs = p.toString();
  return qs ? `/posts?${qs}` : "/posts";
}

function PostListWithFilter() {
  const { posts, ready } = usePosts();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCategory = searchParams.get("category");
  const activeCategory: CategorySlug | null = isValidCategory(rawCategory)
    ? rawCategory
    : null;
  const q = searchParams.get("q")?.trim() ?? "";

  const sorted = [...posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const filtered = sorted
    .filter((p) => !activeCategory || p.category === activeCategory)
    .filter((p) => {
      if (!q) return true;
      const lower = q.toLowerCase();
      return (
        p.title.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower)
      );
    });

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newQ = (new FormData(e.currentTarget).get("search") as string)?.trim() ?? "";
    router.push(buildHref({ category: activeCategory, q: newQ }));
  }

  return (
    <>
      {/* Search input */}
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
            href={buildHref({ category: activeCategory })}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            クリア
          </Link>
        )}
      </form>

      {/* Category filter pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={buildHref({ q })}
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
            href={buildHref({ category: cat.slug, q })}
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

      {/* Post list */}
      {!ready ? (
        <ul className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          {q ? (
            <>
              <p className="text-zinc-600">
                「{q}」に一致する投稿はありません。
              </p>
              <Link
                href={buildHref({ category: activeCategory })}
                className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                検索をクリア
              </Link>
            </>
          ) : activeCategory ? (
            <>
              <p className="text-zinc-600">
                このカテゴリの投稿はまだありません。
              </p>
              <Link
                href="/new"
                className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                最初の投稿を書く
              </Link>
            </>
          ) : (
            <>
              <p className="text-zinc-600">No posts yet.</p>
              <Link
                href="/new"
                className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                Write the first post
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md sm:px-5"
            >
              <div className="flex items-center gap-3">
                {post.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.imageUrl}
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
                    <span className="text-zinc-600">Likes: {post.likes}</span>
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
            Recent posts
          </h1>
          <p className="mt-2 max-w-md text-[15px] text-zinc-500">
            Browse discussions on AddBuy+C. Create a thread to share ideas,
            questions, or updates.
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
        >
          Create new post
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
