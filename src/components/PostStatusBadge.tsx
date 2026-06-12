type Props = { hasBestAnswer: boolean };

export function PostStatusBadge({ hasBestAnswer }: Props) {
  if (hasBestAnswer) {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
        解決済み
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-800">
      相談中
    </span>
  );
}
