"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePosts } from "@/context/PostsProvider";

export default function NewPostPage() {
  const router = useRouter();
  const { addPost } = usePosts();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLock = useRef(false);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      setError(null);
      if (!file) {
        setImagePreview(null);
        setImageFileName(null);
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please choose an image file.");
        setImagePreview(null);
        setImageFileName(null);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Image must be 2MB or smaller for this MVP.");
        setImagePreview(null);
        setImageFileName(null);
        return;
      }
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === "string") setImagePreview(result);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const clearImage = useCallback(() => {
    setImagePreview(null);
    setImageFileName(null);
    setError(null);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) {
      setError("Title and description are required.");
      return;
    }
    if (submitLock.current) return;
    submitLock.current = true;
    addPost({
      title: t,
      description: d,
      imageUrl: imagePreview,
    });
    router.push("/");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          ← Back to posts
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900">
          New post
        </h1>
        <p className="mt-2 text-[15px] text-zinc-500">
          Add a title, details, and optionally an image. Posts are saved in your
          browser for this demo.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium text-zinc-800"
          >
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What is this about?"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-zinc-800"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share context, questions, or links…"
            rows={6}
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-800">
            Image <span className="font-normal text-zinc-400">(optional)</span>
          </span>
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-10 transition hover:border-zinc-300 hover:bg-zinc-50">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onFileChange}
              />
              <span className="text-sm font-medium text-zinc-700">
                Click to upload
              </span>
              <span className="mt-1 text-xs text-zinc-400">
                PNG, JPG, WebP up to 2MB
              </span>
            </label>
            {imageFileName && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                <span className="truncate">{imageFileName}</span>
                <button
                  type="button"
                  onClick={clearImage}
                  className="shrink-0 text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                >
                  Remove
                </button>
              </div>
            )}
            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 w-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            Publish post
          </button>
          <Link
            href="/"
            className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
