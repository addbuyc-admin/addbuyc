export const CATEGORIES = [
  {
    slug: "fashion",
    label: "ファッション・ブランド品",
    description: "服・バッグ・財布・時計・スニーカーなどの相談",
  },
  {
    slug: "beauty",
    label: "美容・コスメ",
    description: "コスメ・香水・スキンケア・美容家電などの相談",
  },
  {
    slug: "gadget",
    label: "家電・ガジェット",
    description: "スマホ・PC・イヤホン・生活家電などの相談",
  },
  {
    slug: "hobby",
    label: "ホビー・エンタメ",
    description: "フィギュア・トレカ・ゲーム・限定品などの相談",
  },
  {
    slug: "gourmet",
    label: "飲食店・グルメ",
    description: "レストラン・カフェ・記念日・接待などのお店相談",
  },
  {
    slug: "other",
    label: "その他",
    description: "上記に当てはまらない相談",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function getCategoryLabel(slug: CategorySlug): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
