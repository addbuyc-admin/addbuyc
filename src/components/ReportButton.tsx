"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";
import { createSafeId } from "@/lib/create-safe-id";

const REPORTS_KEY = "addbuyc_reported";

const REASONS = [
  { value: "spam", label: "スパム" },
  { value: "inappropriate", label: "不適切な内容" },
  { value: "harassment", label: "誹謗中傷" },
  { value: "false_info", label: "偽情報の可能性" },
  { value: "other", label: "その他" },
] as const;

type ReasonValue = (typeof REASONS)[number]["value"];

// "loading"       : localStorage 未読み込み（ちらつき防止のため非表示）
// "not_reported"  : 未通報
// { token: string } : 通報済み・取消可能
// { token: null }   : 通報済み・取消不可（旧形式からの移行データ）
type ReportState =
  | "loading"
  | "not_reported"
  | { token: string | null };

type Props = {
  targetType: "post" | "reply";
  targetId: string;
};

// localStorage 形式: { "post:123": "uuid-token" | null }
// 旧形式（配列）は読み込み時に自動移行する
function readReportedMap(): Map<string, string | null> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as unknown;

    if (Array.isArray(parsed)) {
      // 旧形式: ["post:123"] → token なしで移行
      const map = new Map<string, string | null>(
        (parsed as unknown[]).map((k) => [String(k), null]),
      );
      writeReportedMap(map);
      return map;
    }

    if (parsed !== null && typeof parsed === "object") {
      return new Map(
        Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
          k,
          typeof v === "string" ? v : null,
        ]),
      );
    }

    return new Map();
  } catch {
    return new Map();
  }
}

function writeReportedMap(map: Map<string, string | null>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    REPORTS_KEY,
    JSON.stringify(Object.fromEntries(map)),
  );
}

export function ReportButton({ targetType, targetId }: Props) {
  const { user } = useAuth();
  const key = `${targetType}:${targetId}`;
  const [reportState, setReportState] = useState<ReportState>("loading");
  const [isOpen, setIsOpen] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [reason, setReason] = useState<ReasonValue>("spam");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const map = readReportedMap();
    if (map.has(key)) {
      setReportState({ token: map.get(key) ?? null });
    } else {
      setReportState("not_reported");
    }
  }, [key]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const token = createSafeId();
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: Number(targetId),
          reason,
          description: description.trim() || null,
          client_token: token,
        }),
      });
      if (res.ok) {
        const map = readReportedMap();
        map.set(key, token);
        writeReportedMap(map);
        setReportState({ token });
        setIsOpen(false);
        setDescription("");
      } else {
        setError("送信に失敗しました。もう一度お試しください。");
      }
    } catch {
      setError("エラーが発生しました。");
    }
    setSubmitting(false);
  }

  async function handleCancel() {
    if (typeof reportState === "string" || reportState.token === null) return;
    const currentToken = reportState.token;
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: Number(targetId),
          token: currentToken,
        }),
      });
      if (res.ok) {
        const map = readReportedMap();
        map.delete(key);
        writeReportedMap(map);
        setReportState("not_reported");
      } else {
        setError("取消に失敗しました。");
      }
    } catch {
      setError("エラーが発生しました。");
    }
    setCancelling(false);
  }

  // localStorage 読み込み前はレンダリングしない（ハイドレーションのちらつき防止）
  if (reportState === "loading") return null;

  // 通報済み（token あり → 取消可能）
  if (typeof reportState !== "string") {
    const { token } = reportState;

    if (token === null) {
      // 旧形式のデータ: 取消不可
      return <span className="text-xs text-stone-400">通報済み</span>;
    }

    // 取消可能
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={handleCancel}
          disabled={cancelling}
          className="text-xs text-stone-400 underline-offset-2 transition hover:text-stone-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelling ? "取消中…" : "通報取消"}
        </button>
        {error && (
          <p className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // 未通報 - ログイン案内表示中
  if (showLoginHint) {
    return (
      <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-left">
        <p className="text-xs font-medium text-stone-800">通報するにはログインが必要です</p>
        <p className="text-xs text-stone-500">ログインすると、不適切な投稿や返信を通報できます</p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/signin"
            className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-800"
          >
            ログインする
          </Link>
          <Link
            href="/signup"
            className="text-xs text-stone-500 underline-offset-2 transition hover:text-stone-700 hover:underline"
          >
            アカウントを作成する
          </Link>
          <button
            type="button"
            onClick={() => setShowLoginHint(false)}
            className="ml-auto text-xs text-stone-400 transition hover:text-stone-600"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // 未通報 - フォームが閉じている
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          if (!user) {
            setShowLoginHint(true);
            return;
          }
          setIsOpen(true);
        }}
        className="text-xs text-stone-400 underline-offset-2 transition hover:text-stone-600 hover:underline"
      >
        通報する
      </button>
    );
  }

  // 未通報 - フォームが開いている
  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
    >
      <p className="text-sm font-medium text-stone-800">通報する</p>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-600">通報理由</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReasonValue)}
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-900/10"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-stone-600">
          補足コメント{" "}
          <span className="font-normal text-stone-400">（任意）</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="詳細があれば記入してください…"
          className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-900/10"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-stone-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "送信中…" : "通報を送信する"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
          className="text-xs text-stone-500 underline-offset-2 transition hover:text-stone-700 hover:underline"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
