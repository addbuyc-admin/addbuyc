export const CATEGORIES = [
  {
    slug: "fashion",
    label: "ファッション・ブランド品",
    description: "服・バッグ・財布・時計・スニーカーなどの相談",
    badgeClassName: "bg-indigo-100 text-indigo-800",
  },
  {
    slug: "beauty",
    label: "美容・コスメ",
    description: "コスメ・香水・スキンケア・美容家電などの相談",
    badgeClassName: "bg-pink-100 text-pink-700",
  },
  {
    slug: "gadget",
    label: "家電・ガジェット",
    description: "スマホ・PC・イヤホン・生活家電などの相談",
    badgeClassName: "bg-slate-100 text-slate-700",
  },
  {
    slug: "hobby",
    label: "ホビー・エンタメ",
    description: "フィギュア・トレカ・ゲーム・限定品などの相談",
    badgeClassName: "bg-purple-100 text-purple-700",
  },
  {
    slug: "gourmet",
    label: "飲食店・グルメ",
    description: "レストラン・カフェ・記念日・接待などのお店相談",
    badgeClassName: "bg-orange-100 text-orange-700",
  },
  {
    slug: "vehicle",
    label: "車・バイク",
    description: "車・バイク・カー用品などの相談",
    badgeClassName: "bg-blue-100 text-blue-700",
  },
  {
    slug: "travel",
    label: "旅行・おでかけ",
    description: "旅行・ホテル・レジャーなどの相談",
    badgeClassName: "bg-teal-100 text-teal-700",
  },
  {
    slug: "service",
    label: "暮らしのサービス",
    description: "引越し・宅配・サブスクなどの相談",
    badgeClassName: "bg-lime-100 text-lime-700",
  },
  {
    slug: "finance",
    label: "金融・投資",
    description: "保険・投資・クレジットカードなどの相談",
    badgeClassName: "bg-green-100 text-green-700",
  },
  {
    slug: "other",
    label: "その他",
    description: "上記に当てはまらない相談",
    badgeClassName: "bg-zinc-100 text-zinc-600",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategoryLabel(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
