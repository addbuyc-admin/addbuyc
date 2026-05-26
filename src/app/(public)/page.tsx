"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { useState } from "react";
import { usePosts } from "@/context/PostsProvider";
import { CATEGORIES } from "@/lib/categories";
import { CategoryBadge } from "@/components/CategoryBadge";
import { PostStatusBadge } from "@/components/PostStatusBadge";

const DISPLAY_CATEGORIES = CATEGORIES;

const HOW_TO_USE = [
  {
    step: "1",
    title: "相談する",
    description: "気になる商品やお店について投稿して、みんなに聞いてみましょう。",
  },
  {
    step: "2",
    title: "みんなが回答する",
    description: "コミュニティメンバーが経験や知識をもとに返信してくれます。",
  },
  {
    step: "3",
    title: "Likeや返信を参考にする",
    description: "役立った回答にLikeを。参考になった意見から買い物の判断材料にしましょう。",
  },
];

export default function HomePage() {
  const { posts, ready } = usePosts();
  const router = useRouter();
  const [heroSearch, setHeroSearch] = useState("");

  function handleHeroSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = heroSearch.trim();
    router.push(q ? `/posts?q=${encodeURIComponent(q)}` : "/posts");
  }

  const latestPosts = [...posts]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-16">

      {/* Hero */}
      <section className="rounded-2xl border border-zinc-200 bg-white px-8 py-12 text-center shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
          AddBuy+C
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
          買う前に、<br className="sm:hidden" />ひとりで迷わない。
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-zinc-500">
          ファッション・コスメ・ガジェット・グルメまで、気になる商品やお店についてみんなに相談できるコミュニティです。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/new"
            className="inline-flex items-center rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            相談する
          </Link>
          <Link
            href="/posts"
            className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            投稿を見る
          </Link>
        </div>
        <form
          onSubmit={handleHeroSearch}
          className="mx-auto mt-6 flex w-full max-w-md gap-2"
        >
          <input
            type="text"
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            placeholder="気になる商品・お店を検索…"
            className="min-w-0 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            検索
          </button>
        </form>
      </section>

      {/* Category links */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          カテゴリから探す
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DISPLAY_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/posts?category=${cat.slug}`}
              className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cat.badgeClassName}`}
              >
                {cat.label}
              </span>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest posts */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          最新の相談
        </h2>
        <div className="mt-4">
          {!ready ? (
            <ul className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <li key={i} className="h-14 animate-pulse rounded-2xl bg-zinc-100" />
              ))}
            </ul>
          ) : latestPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-12 text-center">
              <p className="text-zinc-500">まだ投稿がありません。</p>
              <Link
                href="/new"
                className="mt-3 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
              >
                最初の相談を投稿する
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {latestPosts.map((post) => (
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
        </div>
        {latestPosts.length > 0 && (
          <div className="mt-4 text-right">
            <Link
              href="/posts"
              className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline"
            >
              もっと見る →
            </Link>
          </div>
        )}
      </section>

      {/* How to use */}
      <section>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          使い方
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_TO_USE.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                {item.step}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-zinc-900">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
