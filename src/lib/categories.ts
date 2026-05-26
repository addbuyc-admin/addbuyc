export const CATEGORIES = [
  {
    slug: "fashion",
    label: "ファッション・ブランド品",
    description: "衣類・バッグ・靴・財布・ブランド品などの相談",
    badgeClassName: "bg-indigo-100 text-indigo-800",
  },
  {
    slug: "beauty",
    label: "美容・コスメ",
    description: "美容・コスメ・スキンケアなどの相談",
    badgeClassName: "bg-pink-100 text-pink-700",
  },
  {
    slug: "watch_jewelry",
    label: "時計・ジュエリー",
    description: "時計・ジュエリー・アクセサリーなどの相談",
    badgeClassName: "bg-yellow-100 text-yellow-700",
  },
  {
    slug: "gadget",
    label: "家電・ガジェット",
    description: "家電・ガジェット・デジタル機器などの相談",
    badgeClassName: "bg-slate-100 text-slate-700",
  },
  {
    slug: "vehicle",
    label: "車・バイク",
    description: "車・バイク・カー用品などの相談",
    badgeClassName: "bg-blue-100 text-blue-700",
  },
  {
    slug: "interior",
    label: "インテリア・雑貨",
    description: "家具・インテリア・雑貨・生活用品などの相談",
    badgeClassName: "bg-amber-100 text-amber-700",
  },
  {
    slug: "hobby",
    label: "ホビー・エンタメ",
    description: "ホビー・エンタメ・コレクションなどの相談",
    badgeClassName: "bg-purple-100 text-purple-700",
  },
  {
    slug: "gourmet",
    label: "飲食店・グルメ",
    description: "飲食店・グルメ・食品などの相談",
    badgeClassName: "bg-orange-100 text-orange-700",
  },
  {
    slug: "travel",
    label: "旅行・おでかけ",
    description: "旅行・ホテル・レジャーなどの相談",
    badgeClassName: "bg-teal-100 text-teal-700",
  },
  {
    slug: "finance",
    label: "金融・投資",
    description: "保険・投資・クレジットカードなどの相談",
    badgeClassName: "bg-green-100 text-green-700",
  },
  {
    slug: "service",
    label: "暮らしのサービス",
    description: "引越し・宅配・サブスクなどの相談",
    badgeClassName: "bg-lime-100 text-lime-700",
  },
  {
    slug: "other",
    label: "その他",
    description: "その他の相談",
    badgeClassName: "bg-zinc-100 text-zinc-600",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategoryLabel(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
