export type AdvisorRankInfo = {
  label: string;
  className: string;
  priority: number;
};

export type RankStats = {
  reply_count: number;
  total_reply_likes: number;
  best_answer_count: number;
};

export function getAdvisorRank(stat: RankStats): AdvisorRankInfo | null {
  if (stat.best_answer_count >= 5 && stat.total_reply_likes >= 50)
    return { label: "認定アドバイザー", className: "bg-violet-100 text-violet-700", priority: 4 };
  if (stat.best_answer_count >= 3 && stat.total_reply_likes >= 30)
    return { label: "ゴールドアドバイザー", className: "bg-amber-100 text-amber-700", priority: 3 };
  if (stat.reply_count >= 10 && stat.total_reply_likes >= 10)
    return { label: "シルバーアドバイザー", className: "bg-slate-100 text-slate-600", priority: 2 };
  if (stat.reply_count >= 5)
    return { label: "ブロンズアドバイザー", className: "bg-orange-100 text-orange-700", priority: 1 };
  return null;
}

export const ADVISOR_RANK_CONDITIONS = [
  {
    label: "認定アドバイザー",
    className: "bg-violet-100 text-violet-700",
    condition: "ベストアンサー5件以上 かつ 返信Like合計50以上",
  },
  {
    label: "ゴールドアドバイザー",
    className: "bg-amber-100 text-amber-700",
    condition: "ベストアンサー3件以上 かつ 返信Like合計30以上",
  },
  {
    label: "シルバーアドバイザー",
    className: "bg-slate-100 text-slate-600",
    condition: "返信10件以上 かつ 返信Like合計10以上",
  },
  {
    label: "ブロンズアドバイザー",
    className: "bg-orange-100 text-orange-700",
    condition: "返信5件以上",
  },
] as const;
