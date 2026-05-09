"use client";

import Link from "next/link";
import { usePosts } from "@/context/PostsProvider";
import { CategoryBadge } from "@/components/CategoryBadge";

export default function HomePage() {
  const { posts, ready } = usePosts();

  const sorted = [...posts].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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

      {!ready ? (
        <ul className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-zinc-100"
            />
          ))}
        </ul>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          <p className="text-zinc-600">No posts yet.</p>
          <Link
            href="/new"
            className="mt-4 inline-block text-sm font-medium text-zinc-900 underline underline-offset-4"
          >
            Write the first post
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((post) => (
            <li
              key={post.id}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md sm:px-5"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Link
                  href={`/posts/${post.id}`}
                  className="min-w-0 flex-1 text-base font-semibold tracking-tight text-zinc-900 underline-offset-4 hover:underline"
                >
                  {post.title}
                </Link>
                <CategoryBadge category={post.category} />
                <time dateTime={post.createdAt}>
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <span className="ml-auto text-zinc-600">Likes: {post.likes}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
