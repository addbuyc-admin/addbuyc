"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/browser";
import { formatDateTime } from "@/lib/format";
import type { Notification } from "@/lib/types";

const MAX_NOTIFICATIONS = 10;

const NOTIFICATION_LABEL: Record<string, string> = {
  post_reply:  "投稿に返信がありました",
  post_like:   "投稿にLikeされました",
  reply_like:  "返信にLikeされました",
  best_answer: "返信がベストアンサーに選ばれました",
};

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasUnread = notifications.some((n) => n.read_at === null);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, user_id, type, post_id, reply_id, actor_user_id, read_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MAX_NOTIFICATIONS);
    if (data) setNotifications(data as Notification[]);
  }, [userId]);

  // 初回フェッチ
  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // フォーカス復帰時に再フェッチ（Realtimeが効かない場合のフォールバック）
  useEffect(() => {
    const handleFocus = () => { void fetchNotifications(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as Notification;
          setNotifications((prev) => {
            const merged = [incoming, ...prev];
            return merged.slice(0, MAX_NOTIFICATIONS);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // 通知クリック：既読化 + 投稿詳細へ遷移
  async function handleClickNotification(notification: Notification) {
    setOpen(false);
    if (notification.read_at === null) {
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: now } : n)),
      );
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", notification.id);
    }
    router.push(`/posts/${notification.post_id}`);
  }

  // 行の「既読にする」ボタン：遷移なし
  async function handleMarkOneRead(e: React.MouseEvent, notification: Notification) {
    e.stopPropagation();
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read_at: now } : n)),
    );
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", notification.id);
  }

  // 「すべて既読」
  async function handleMarkAllRead() {
    if (!hasUnread || markingAllRead) return;
    setMarkingAllRead(true);
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
    setMarkingAllRead(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ベルアイコン */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="通知"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <span className="relative inline-flex">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {hasUnread && (
            <span
              className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ backgroundColor: "#F43F5E" }}
            />
          )}
        </span>
      </button>

      {/* ドロップダウン */}
      {open && (
        <div className="fixed left-4 right-4 top-16 z-50 rounded-2xl border border-zinc-200 bg-white shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-10 sm:w-80">
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              通知
            </p>
            {hasUnread && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={markingAllRead}
                className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900 disabled:opacity-50"
              >
                すべて既読
              </button>
            )}
          </div>

          {/* 通知リスト */}
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-400">
              通知はありません
            </p>
          ) : (
            <ul className="max-h-[360px] divide-y divide-zinc-100 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => void handleClickNotification(n)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-zinc-50 ${
                      n.read_at === null ? "bg-zinc-50/80" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`break-words text-sm leading-snug ${
                            n.read_at === null
                              ? "font-medium text-zinc-900"
                              : "text-zinc-500"
                          }`}
                        >
                          {NOTIFICATION_LABEL[n.type] ?? n.type}
                        </p>
                        <time className="mt-0.5 block text-xs text-zinc-400">
                          {formatDateTime(n.created_at)}
                        </time>
                      </div>
                      {n.read_at === null && (
                        <button
                          type="button"
                          onClick={(e) => void handleMarkOneRead(e, n)}
                          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-200 transition hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          既読にする
                        </button>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
