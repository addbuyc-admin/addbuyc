import Link from "next/link";

const HELP_SECTIONS = [
  {
    id: "howto",
    title: "AddBuy+Cの使い方",
    content: `気になる商品・お店・ブランド品について投稿して、コミュニティメンバーから意見や情報を集めることができます。投稿に対して返信・いいね・おなじ気持ちで反応したり、気になる投稿やユーザーをフォローしたりと、様々な方法でコミュニティに参加できます。`,
  },
  {
    id: "onajikimochi",
    title: "おなじ気持ちとは",
    content: `投稿に対して「自分も気になっている」「同じ悩みがある」と感じたときに押せるリアクションです。いいねのかわりに共感を伝えられます。おなじ気持ちが多い投稿は「共感順」フィルターで見つけやすくなります。`,
  },
  {
    id: "post-follow",
    title: "投稿フォローとは",
    content: `気になる投稿をフォローすると、その投稿に新しい返信があったときに通知を受け取ることができます。気になる相談の続きを見逃さずに確認できます。フォロー中の投稿はマイページの「フォロー管理」セクションで確認できます。`,
  },
  {
    id: "best-answer",
    title: "ベストアンサーとは",
    content: `投稿者が「この返信が一番参考になった」と感じた返信をベストアンサーに設定できます。ベストアンサーに選ばれた返信は返信一覧の先頭に表示され、投稿のステータスが「解決済み」に変わります。ベストアンサーに選ばれると返信者に通知が届きます。`,
  },
  {
    id: "advisor-rank",
    title: "アドバイザーランクとは",
    content: `返信実績（返信数・いいね数・ベストアンサー数）に応じて付与されるランクです。ランクが高いほど、より多くの相談に貢献しているメンバーとして表示されます。`,
    link: { href: "/advisor-ranks", label: "ランク一覧・詳細を見る" },
  },
  {
    id: "report",
    title: "通報について",
    content: `不適切な投稿や返信は、各投稿・返信の下部にある「通報する」ボタンから通報できます。通報理由を選択してお送りください。運営チームが内容を確認し、必要に応じて対処します。なお、通報内容は対象ユーザーには通知されません。`,
  },
  {
    id: "contact",
    title: "運営への問い合わせ",
    content: `現在、お問い合わせフォームは準備中です。今後整備予定です。`,
    comingSoon: true,
  },
  {
    id: "delete-account",
    title: "アカウント削除について",
    content: `アカウントの削除をご希望の場合は、削除申請フォームよりお手続きいただけるよう、今後整備予定です。現在は対応窓口を準備中です。`,
    comingSoon: true,
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">ヘルプ</h1>
        <p className="mt-2 text-sm text-stone-500">
          AddBuy+Cの使い方や各機能の説明、困ったときの対応方法をご確認いただけます。
        </p>
      </div>

      <div className="space-y-4">
        {HELP_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-stone-800">{section.title}</h2>
              {section.comingSoon && (
                <span className="mt-0.5 shrink-0 inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-medium text-stone-400">
                  準備中
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{section.content}</p>
            {section.link && (
              <Link
                href={section.link.href}
                className="mt-3 inline-flex text-sm font-medium text-amber-700 underline-offset-2 transition hover:text-amber-600 hover:underline"
              >
                {section.link.label} →
              </Link>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
