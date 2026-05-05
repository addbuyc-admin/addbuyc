import type { Post } from "./types";

export const SEED_POSTS: Post[] = [
  {
    id: "seed-1",
    title: "Welcome to AddBuy+C",
    description:
      "This is a minimal forum MVP. Create posts, add optional images, and like what resonates. Data is stored in your browser for now — no database yet.",
    imageUrl: "https://picsum.photos/seed/addbuy1/800/450",
    likes: 12,
    createdAt: new Date("2026-05-01T10:00:00Z").toISOString(),
  },
  {
    id: "seed-2",
    title: "Tips for clearer discussion titles",
    description:
      "Short, specific titles help others find threads. Pair the title with a description that adds context, links, or questions you care about.",
    imageUrl: null,
    likes: 5,
    createdAt: new Date("2026-05-02T14:30:00Z").toISOString(),
  },
  {
    id: "seed-3",
    title: "Show & tell: weekend builds",
    description:
      "Share what you shipped this week — even tiny experiments count. Optional image uploads make it easy to show UI sketches or screenshots.",
    imageUrl: "https://picsum.photos/seed/forum2/800/450",
    likes: 28,
    createdAt: new Date("2026-05-04T09:15:00Z").toISOString(),
  },
];
