export const CATEGORIES = [
  {
    slug: "fashion",
    label: "ファッション・ブランド品",
    description: "衣類・バッグ・靴・財布・ブランド品などの相談",
    badgeClassName: "bg-indigo-100 text-indigo-900",
  },
  {
    slug: "beauty",
    label: "美容・コスメ",
    description: "美容・コスメ・スキンケアなどの相談",
    badgeClassName: "bg-rose-100 text-rose-800",
  },
  {
    slug: "watch_jewelry",
    label: "時計・ジュエリー",
    description: "時計・ジュエリー・アクセサリーなどの相談",
    badgeClassName: "bg-amber-100 text-amber-900",
  },
  {
    slug: "gadget",
    label: "家電・ガジェット",
    description: "家電・ガジェット・デジタル機器などの相談",
    badgeClassName: "bg-slate-200 text-slate-700",
  },
  {
    slug: "vehicle",
    label: "車・バイク",
    description: "車・バイク・カー用品などの相談",
    badgeClassName: "bg-sky-100 text-sky-800",
  },
  {
    slug: "interior",
    label: "インテリア・雑貨",
    description: "家具・インテリア・雑貨・生活用品などの相談",
    badgeClassName: "bg-stone-200 text-stone-700",
  },
  {
    slug: "hobby",
    label: "ホビー・エンタメ",
    description: "ホビー・エンタメ・コレクションなどの相談",
    badgeClassName: "bg-violet-100 text-violet-800",
  },
  {
    slug: "gourmet",
    label: "飲食店・グルメ",
    description: "飲食店・グルメ・食品などの相談",
    badgeClassName: "bg-orange-100 text-orange-800",
  },
  {
    slug: "travel",
    label: "旅行・おでかけ",
    description: "旅行・ホテル・レジャーなどの相談",
    badgeClassName: "bg-teal-100 text-teal-800",
  },
  {
    slug: "finance",
    label: "金融・投資",
    description: "保険・投資・クレジットカードなどの相談",
    badgeClassName: "bg-emerald-100 text-emerald-800",
  },
  {
    slug: "service",
    label: "暮らしのサービス",
    description: "引越し・宅配・サブスクなどの相談",
    badgeClassName: "bg-lime-100 text-lime-800",
  },
  {
    slug: "other",
    label: "その他",
    description: "その他の相談",
    badgeClassName: "bg-stone-200 text-stone-600",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategoryLabel(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
