"use client";

import Image from "next/image";
import type { Post } from "@/lib/types";

type PostCardProps = {
  post: Post;
  onLike: (id: string) => void;
};

function isDataUrl(url: string) {
  return url.startsWith("data:image/");
}

export function PostCard({ post, onLike }: PostCardProps) {
  const hasImage = Boolean(post.imageUrl);

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      {hasImage && post.imageUrl && (
        <div className="relative aspect-[16/9] w-full bg-zinc-100">
          {isDataUrl(post.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={post.imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 672px"
              priority={false}
            />
          )}
        </div>
      )}
      <div className="flex flex-col gap-4 p-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {post.title}
          </h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-600">
            {post.description}
          </p>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
          <time
            className="text-xs text-zinc-400"
            dateTime={post.createdAt}
          >
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </time>
          <button
            type="button"
            onClick={() => onLike(post.id)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
            aria-label={`Like post: ${post.title}`}
          >
            <span aria-hidden className="text-base leading-none">
              ♥
            </span>
            <span>{post.likes}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
