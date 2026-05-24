const RANK_ICONS: Record<string, string> = {
  "認定アドバイザー": "✦",
  "ゴールドアドバイザー": "★",
  "シルバーアドバイザー": "◆",
  "ブロンズアドバイザー": "●",
};

type Props = {
  rank: { label: string; className: string } | null;
  showNone?: boolean;
};

export function AdvisorRankBadge({ rank, showNone = false }: Props) {
  if (!rank) {
    if (showNone) {
      return <span className="text-sm text-zinc-400">ランクなし</span>;
    }
    return null;
  }
  const icon = RANK_ICONS[rank.label] ?? "";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${rank.className}`}>
      <span aria-hidden="true">{icon}</span>
      {rank.label}
    </span>
  );
}
