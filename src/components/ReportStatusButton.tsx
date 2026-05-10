"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ReportStatus = "open" | "resolved" | "dismissed";

type Props = {
  id: number;
  currentStatus: ReportStatus;
};

export function ReportStatusButton({ id, currentStatus }: Props) {
  const router = useRouter();
  const [fetching, setFetching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const loading = fetching || isPending;

  async function handleUpdate(nextStatus: ReportStatus) {
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        console.error("Failed to update report status");
      }
    } catch (err) {
      console.error("Report status update error:", err);
    }
    setFetching(false);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {currentStatus !== "resolved" && (
        <button
          type="button"
          onClick={() => handleUpdate("resolved")}
          disabled={loading}
          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          対応済み
        </button>
      )}
      {currentStatus !== "dismissed" && (
        <button
          type="button"
          onClick={() => handleUpdate("dismissed")}
          disabled={loading}
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          対応不要
        </button>
      )}
      {currentStatus !== "open" && (
        <button
          type="button"
          onClick={() => handleUpdate("open")}
          disabled={loading}
          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          未対応に戻す
        </button>
      )}
      {loading && <span className="text-xs text-zinc-400">処理中…</span>}
    </div>
  );
}
