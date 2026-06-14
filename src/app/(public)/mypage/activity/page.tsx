"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";

type ActivityItem = {
  label: string;
  description: string;
  href?: string;
};

const FROM_ME: ActivityItem[] = [
  { label: "返信", description: "自分が書いた返信の一覧", href: "/mypage/replies" },
  { label: "いいね", description: "返信につけたいいね" },
  { label: "おなじ気持ち", description: "投稿につけたおなじ気持ち" },
  { label: "投稿フォロー", description: "フォロー中の投稿" },
  { label: "ベストアンサー", description: "ベストアンサーに選ばれた返信" },
];

const FROM_OTHERS: ActivityItem[] = [
  { label: "返信", description: "自分の投稿に届いた返信" },
  { label: "いいね", description: "返信に届いたいいね" },
  { label: "おなじ気持ち", description: "投稿に届いたおなじ気持ち" },
  { label: "投稿フォロー", description: "投稿をフォローしたユーザー" },
  { label: "ベストアンサー", description: "ベストアンサーに選ばれた回数" },
];

function ActivityCard({ item }: { item: ActivityItem }) {
  const cardBase = "rounded-xl border p-4 flex flex-col gap-2 transition";

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={`${cardBase} border-stone-200 bg-white shadow-sm hover:border-amber-200 hover:bg-amber-50 hover:shadow-md`}
      >
        <p className="text-sm font-semibold text-stone-800">{item.label}</p>
        <p className="text-xs leading-relaxed text-stone-500">{item.description}</p>
        <p className="mt-auto text-xs font-medium text-amber-700">一覧を見る →</p>
      </Link>
    );
  }

  return (
    <div className={`${cardBase} border-stone-100 bg-stone-50 shadow-none`}>
      <p className="text-sm font-semibold text-stone-600">{item.label}</p>
      <p className="text-xs leading-relaxed text-stone-400">{item.description}</p>
      <span className="mt-auto inline-flex w-fit rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-400">
        準備中
      </span>
    </div>
  );
}

export default function ActivityPage() {
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
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">アクティビティ</h1>
        <p className="mt-1.5 text-sm text-stone-500">
          自分の行動履歴と、他のユーザーから受け取った反応を確認できます。
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {/* 自分から */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-stone-800">自分から</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FROM_ME.map((item) => (
              <ActivityCard key={item.label + "-from"} item={item} />
            ))}
          </div>
        </section>

        {/* 相手から */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-stone-800">相手から</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FROM_OTHERS.map((item) => (
              <ActivityCard key={item.label + "-to"} item={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
