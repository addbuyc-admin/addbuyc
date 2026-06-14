"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";

const PRIVACY_ITEMS = [
  {
    label: "公開プロフィールの表示設定",
    description: "プロフィールページをすべてのユーザーに公開するか設定できます。",
  },
  {
    label: "アクティビティ表示設定",
    description: "自分のアクティビティ（投稿・返信・いいねなど）の公開範囲を設定できます。",
  },
  {
    label: "フォロー/フォロワー表示設定",
    description: "フォロー中・フォロワーの一覧を公開するか設定できます。",
  },
  {
    label: "最近の投稿/返信の表示設定",
    description: "プロフィールページに表示する投稿・返信の公開範囲を設定できます。",
  },
  {
    label: "ベストアンサー表示設定",
    description: "ベストアンサーに選ばれた返信をプロフィールに表示するか設定できます。",
  },
];

export default function PrivacyPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-stone-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-sm text-stone-600">このページを見るにはサインインが必要です。</p>
        <Link
          href="/signin"
          className="mt-4 inline-block rounded-full bg-stone-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800"
        >
          サインインへ
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/mypage" className="text-sm font-medium text-stone-500 transition hover:text-stone-900">
        ← プロフィールに戻る
      </Link>

      <div className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">プライバシー</h1>
        <p className="mt-1.5 text-sm text-stone-500">
          公開プロフィールやアクティビティの表示範囲を管理できます。
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white shadow-md">
        <ul className="divide-y divide-stone-100">
          {PRIVACY_ITEMS.map((item) => (
            <li key={item.label} className="flex items-start justify-between gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800">{item.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{item.description}</p>
              </div>
              <span className="mt-0.5 shrink-0 inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-400">
                準備中
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-stone-400">
        プライバシー設定は今後のアップデートで順次対応予定です。
      </p>
    </div>
  );
}
