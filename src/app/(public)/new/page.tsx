"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { usePosts } from "@/context/PostsProvider";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";

export default function NewPostPage() {
  const router = useRouter();
  const { addPost, refetchPosts } = usePosts();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategorySlug>("fashion");
  const [targetUrl, setTargetUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
        setError("画像ファイルを選択してください。");
        setImagePreview(null);
        setImageFileName(null);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("画像は2MB以下にしてください。");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) {
      setError("相談タイトルと相談内容は必須です。");
      return;
    }
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      await addPost({
        title: t,
        description: d,
        imageUrl: imagePreview,
        category,
        targetUrl: targetUrl.trim() || null,
      });
      await refetchPosts();
      router.push("/posts");
    } catch {
      setError("投稿に失敗しました。しばらくしてから再度お試しください。");
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="mb-8">
        <Link
          href="/posts"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          ← 相談一覧へ戻る
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-zinc-900">
          相談を投稿する
        </h1>
        <p className="mt-2 text-[15px] text-zinc-500">
          気になる商品・お店・ブランド品について、みんなに聞いてみましょう。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <label
            htmlFor="category"
            className="text-sm font-medium text-zinc-800"
          >
            カテゴリ
          </label>
          <p className="text-xs text-zinc-400">
            相談内容に近いカテゴリを選んでください
          </p>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategorySlug)}
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition focus:border-zinc-300 focus:ring-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">
            {CATEGORIES.find((c) => c.slug === category)?.description}
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="title"
            className="text-sm font-medium text-zinc-800"
          >
            相談タイトル
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：ルイヴィトンの財布は本物？ / AirPods Proを買うべき？"
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="text-sm font-medium text-zinc-800"
          >
            相談内容
          </label>
          <textarea
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="気になっている点、購入予定の理由、不安な点、比較している商品などを書いてください"
            rows={6}
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="targetUrl"
            className="text-sm font-medium text-zinc-800"
          >
            対象URL{" "}
            <span className="font-normal text-zinc-400">（任意）</span>
          </label>
          <input
            id="targetUrl"
            name="targetUrl"
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
            autoComplete="off"
          />
          <p className="text-xs text-zinc-400">
            商品ページ、店舗ページ、公式サイト、フリマ出品ページなどがあれば貼ってください
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-800">
            画像{" "}
            <span className="font-normal text-zinc-400">（任意）</span>
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
                クリックしてアップロード
              </span>
              <span className="mt-1 text-xs text-zinc-400">
                PNG・JPG・WebP・2MBまで
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
                  削除
                </button>
              </div>
            )}
            {imagePreview && (
              <div className="relative overflow-hidden rounded-xl border border-zinc-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="プレビュー"
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
            disabled={submitting}
            className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "投稿中…" : "投稿する"}
          </button>
          <Link
            href="/posts"
            className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
