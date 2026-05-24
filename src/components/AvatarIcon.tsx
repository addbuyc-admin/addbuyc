const PALETTE = [
  "bg-violet-100 text-violet-600",
  "bg-amber-100 text-amber-600",
  "bg-emerald-100 text-emerald-600",
  "bg-sky-100 text-sky-600",
  "bg-rose-100 text-rose-600",
  "bg-orange-100 text-orange-600",
  "bg-teal-100 text-teal-600",
  "bg-indigo-100 text-indigo-600",
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

type Props = {
  avatarUrl: string | null | undefined;
  name: string;
  size?: number;
};

export function AvatarIcon({ avatarUrl, name, size = 32 }: Props) {
  const initial = (name || "?")[0].toUpperCase();
  const fontSize = Math.max(8, Math.floor(size * 0.42));

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${hashColor(name)}`}
    >
      {initial}
    </span>
  );
}
