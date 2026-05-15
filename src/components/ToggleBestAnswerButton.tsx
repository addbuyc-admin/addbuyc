"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  replyId: number;
  postId: number;
  isBestAnswer: boolean;
};

export function ToggleBestAnswerButton({ replyId, postId, isBestAnswer }: Props) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const loading = fetching || isPending;

  async function handleToggle() {
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/replies/${replyId}/best-answer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set: !isBestAnswer, post_id: postId }),
      });
      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        console.error("Failed to toggle best answer");
      }
    } catch (err) {
      console.error("Toggle best answer error:", err);
    }
    setFetching(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isBestAnswer
          ? "bg-amber-100 text-amber-700 hover:bg-zinc-100 hover:text-zinc-700"
          : "bg-zinc-100 text-zinc-700 hover:bg-amber-50 hover:text-amber-700"
      }`}
    >
      {loading ? "処理中…" : isBestAnswer ? "BA解除" : "BAにする"}
    </button>
  );
}
