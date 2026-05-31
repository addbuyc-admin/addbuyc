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
  const thumbnailUrl = post.imageUrls[0] ?? post.imageUrl ?? null;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      {thumbnailUrl && (
        <div className="relative aspect-[16/9] w-full bg-zinc-100">
          {isDataUrl(thumbnailUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={thumbnailUrl}
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
            {new Date(post.createdAt).toLocaleDateString("ja-JP", {
              timeZone: "Asia/Tokyo",
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
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            <span>{post.likes}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
