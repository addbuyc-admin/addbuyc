"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: number;
  type: "post" | "reply";
  currentStatus: "published" | "hidden";
};

export function ToggleStatusButton({ id, type, currentStatus }: Props) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const loading = fetching || isPending;

  async function handleToggle() {
    const nextStatus = currentStatus === "published" ? "hidden" : "published";
    const endpoint =
      type === "post"
        ? `/api/admin/posts/${id}`
        : `/api/admin/replies/${id}`;

    setFetching(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        console.error("Failed to toggle status");
      }
    } catch (err) {
      console.error("Toggle status error:", err);
    }
    setFetching(false);
  }

  const isPublished = currentStatus === "published";

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isPublished
          ? "bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-700"
          : "bg-red-50 text-red-700 hover:bg-zinc-100 hover:text-zinc-700"
      }`}
    >
      {loading ? "処理中…" : isPublished ? "非表示にする" : "再表示する"}
    </button>
  );
}
