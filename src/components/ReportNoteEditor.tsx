"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: number;
  initialNote: string | null;
};

export function ReportNoteEditor({ id, initialNote }: Props) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [fetching, setFetching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const loading = fetching || isPending;

  async function handleSave() {
    setFetching(true);
    setSaveState("idle");
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: note.trim() || null }),
      });
      if (res.ok) {
        setSaveState("saved");
        startTransition(() => {
          router.refresh();
        });
      } else {
        setSaveState("error");
      }
    } catch {
      setSaveState("error");
    }
    setFetching(false);
  }

  return (
    <div className="flex items-start gap-2">
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaveState("idle");
        }}
        rows={2}
        placeholder="管理メモ（任意）"
        className="flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
      />
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "保存中…" : "保存"}
        </button>
        {saveState === "saved" && (
          <span className="text-xs text-emerald-600">保存しました</span>
        )}
        {saveState === "error" && (
          <span className="text-xs text-red-500">失敗しました</span>
        )}
      </div>
    </div>
  );
}
