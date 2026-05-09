import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type PostRow = {
  id: number;
  title: string;
  description: string;
  category: string | null;
  likes: number | null;
  created_at: string;
  target_url: string | null;
};

type ReplyRow = {
  id: number;
  post_id: number;
  description: string;
  likes: number;
  created_at: string;
};

async function getPosts(): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, description, category, likes, created_at, target_url")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load posts:", error.message);
    return [];
  }
  return (data ?? []) as PostRow[];
}

async function getReplies(): Promise<ReplyRow[]> {
  const { data, error } = await supabase
    .from("replies")
    .select("id, post_id, description, likes, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load replies:", error.message);
    return [];
  }
  return (data ?? []) as ReplyRow[];
}

export default async function DashboardPage() {
  const [posts, replies] = await Promise.all([getPosts(), getReplies()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-400">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            Dashboard
          </h1>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            ログアウト
          </button>
        </form>
      </div>

      {/* Posts */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          投稿{" "}
          <span className="ml-1 text-sm font-normal text-zinc-500">
            ({posts.length}件)
          </span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3 text-right">Likes</th>
                <th className="px-4 py-3">日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-3 text-zinc-400">{post.id}</td>
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={`/posts/${post.id}`}
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {post.category ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {post.likes ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {new Date(post.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {posts.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              投稿なし
            </p>
          )}
        </div>
      </section>

      {/* Replies */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          返信{" "}
          <span className="ml-1 text-sm font-normal text-zinc-500">
            ({replies.length}件)
          </span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Post ID</th>
                <th className="px-4 py-3">内容</th>
                <th className="px-4 py-3 text-right">Likes</th>
                <th className="px-4 py-3">日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {replies.map((reply) => (
                <tr key={reply.id} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-3 text-zinc-400">{reply.id}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/posts/${reply.post_id}`}
                      className="text-blue-600 underline-offset-2 hover:underline"
                    >
                      {reply.post_id}
                    </Link>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-zinc-700">
                    <span className="line-clamp-2">{reply.description}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {reply.likes}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {new Date(reply.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {replies.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              返信なし
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
