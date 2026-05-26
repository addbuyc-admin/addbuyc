type Props = { hasBestAnswer: boolean };

export function PostStatusBadge({ hasBestAnswer }: Props) {
  if (hasBestAnswer) {
    return (
      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
        解決済み
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-sky-100 text-sky-700">
      相談中
    </span>
  );
}
