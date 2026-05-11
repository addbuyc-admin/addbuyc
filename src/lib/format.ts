// JST・24時間表記 (例: 2026/05/10 14:35)
export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
