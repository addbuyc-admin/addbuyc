import Link from "next/link";
import { ADVISOR_RANK_CONDITIONS } from "@/lib/advisor-rank";

export default function AdvisorRanksPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link
          href="/mypage"
          className="text-sm text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline"
        >
          ← マイページに戻る
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900">
          アドバイザーランクについて
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          AddBuy+C では、返信実績をもとにアドバイザーランクを表示しています。
        </p>
      </div>

      <div className="space-y-6">
        {/* ランク一覧 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">ランク一覧と条件</h2>
          <ul className="mt-4 space-y-3">
            {ADVISOR_RANK_CONDITIONS.map((r) => (
              <li key={r.label} className="flex items-start gap-3">
                <span className={`mt-0.5 inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${r.className}`}>
                  {r.label}
                </span>
                <span className="text-sm text-zinc-600">{r.condition}</span>
              </li>
            ))}
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">
                ランクなし
              </span>
              <span className="text-sm text-zinc-600">上記の条件を満たしていない場合</span>
            </li>
          </ul>
        </div>

        {/* 集計の対象について */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">集計の対象について</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
              ランクは公開中（published）の投稿・返信の実績をもとに算出されます。
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
              削除済み・非表示の投稿や返信は集計対象外です。
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
              Likeをした人の一覧は表示されません。
            </li>
          </ul>
        </div>

        {/* 注意事項 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">注意事項</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-600">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
              アドバイザーランクはAddBuy+C内での参考指標です。公式な鑑定資格や専門家認定ではありません。
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
              ランクはリアルタイムに近い形で更新されます。
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-zinc-400">•</span>
              ランクの条件は今後変更される場合があります。
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
