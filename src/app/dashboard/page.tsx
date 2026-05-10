import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";
import { ReportStatusButton } from "@/components/ReportStatusButton";

const REASON_LABELS: Record<string, string> = {
  spam: "スパム",
  inappropriate: "不適切な内容",
  harassment: "誹謗中傷",
  false_info: "偽情報の可能性",
  other: "その他",
};

const REPORT_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  open: { label: "未対応", className: "bg-amber-50 text-amber-700" },
  resolved: { label: "対応済み", className: "bg-emerald-50 text-emerald-700" },
  dismissed: { label: "対応不要", className: "bg-zinc-100 text-zinc-500" },
};

type PostRow = {
  id: number;
  title: string;
  description: string;
  category: string | null;
  likes: number | null;
  created_at: string;
  target_url: string | null;
  status: string;
};

type ReplyRow = {
  id: number;
  post_id: number;
  description: string;
  likes: number;
  created_at: string;
  status: string;
};

type ReportRow = {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  description: string | null;
  created_at: string;
  status: string;
};

async function getPosts(): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, description, category, likes, created_at, target_url, status",
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load posts:", error.message);
    return [];
  }
  return (data ?? []) as PostRow[];
}

async function getReports(): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, description, created_at, status")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load reports:", error.message);
    return [];
  }
  return (data ?? []) as ReportRow[];
}

async function getReplies(): Promise<ReplyRow[]> {
  const { data, error } = await supabase
    .from("replies")
    .select("id, post_id, description, likes, created_at, status")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load replies:", error.message);
    return [];
  }
  return (data ?? []) as ReplyRow[];
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "published"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {status === "published" ? "公開中" : "非表示"}
    </span>
  );
}

function ReportStatusBadge({ status }: { status: string }) {
  const { label, className } = REPORT_STATUS_MAP[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function buildFilterHref(
  current: Record<string, string>,
  key: string,
  value: string,
): string {
  const p = new URLSearchParams(current);
  if (value === "all") {
    p.delete(key);
  } else {
    p.set(key, value);
  }
  const qs = p.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

function FilterTabs({
  options,
  paramKey,
  current,
  currentParams,
}: {
  options: { value: string; label: string }[];
  paramKey: string;
  current: string;
  currentParams: Record<string, string>;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={buildFilterHref(currentParams, paramKey, opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            current === opt.value
              ? "bg-zinc-900 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          {opt.label}
        </Link>
      ))}
    </div>
  );
}

const POST_STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開中" },
  { value: "hidden", label: "非表示" },
];

const REPLY_STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "公開中" },
  { value: "hidden", label: "非表示" },
];

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const resolvedParams = (await searchParams) ?? {};
  const postFilter =
    typeof resolvedParams.postStatus === "string"
      ? resolvedParams.postStatus
      : "all";
  const replyFilter =
    typeof resolvedParams.replyStatus === "string"
      ? resolvedParams.replyStatus
      : "all";

  const currentParams: Record<string, string> = {};
  if (postFilter !== "all") currentParams.postStatus = postFilter;
  if (replyFilter !== "all") currentParams.replyStatus = replyFilter;

  const [posts, replies, reports] = await Promise.all([
    getPosts(),
    getReplies(),
    getReports(),
  ]);

  // reply の id → post_id マップ（通報リンク修正用）
  const replyPostMap = new Map<number, number>(
    replies.map((r) => [r.id, r.post_id]),
  );

  // サマリー集計（フィルター前の全データを使用）
  const openReports = reports.filter((r) => r.status === "open").length;
  const hiddenPosts = posts.filter((p) => p.status === "hidden").length;
  const hiddenReplies = replies.filter((r) => r.status === "hidden").length;

  // フィルター適用後のリスト（表示用）
  const filteredPosts =
    postFilter === "all" ? posts : posts.filter((p) => p.status === postFilter);
  const filteredReplies =
    replyFilter === "all"
      ? replies
      : replies.filter((r) => r.status === replyFilter);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* ヘッダー */}
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

      {/* サマリーカード */}
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "投稿数", value: posts.length, color: "text-zinc-900" },
          { label: "返信数", value: replies.length, color: "text-zinc-900" },
          {
            label: "未対応通報",
            value: openReports,
            color: openReports > 0 ? "text-amber-600" : "text-zinc-900",
          },
          {
            label: "非表示投稿",
            value: hiddenPosts,
            color: hiddenPosts > 0 ? "text-red-600" : "text-zinc-900",
          },
          {
            label: "非表示返信",
            value: hiddenReplies,
            color: hiddenReplies > 0 ? "text-red-600" : "text-zinc-900",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-xs font-medium text-zinc-500">{label}</p>
            <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Posts */}
      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            投稿{" "}
            <span className="ml-1 text-sm font-normal text-zinc-500">
              ({filteredPosts.length}/{posts.length}件)
            </span>
          </h2>
          <FilterTabs
            options={POST_STATUS_OPTIONS}
            paramKey="postStatus"
            current={postFilter}
            currentParams={currentParams}
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">カテゴリ</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Likes</th>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredPosts.map((post) => (
                <tr
                  key={post.id}
                  className={
                    post.status === "hidden"
                      ? "bg-red-50/40 hover:bg-red-50/60"
                      : "hover:bg-zinc-50/70"
                  }
                >
                  <td className="px-4 py-3 text-zinc-400">{post.id}</td>
                  <td className="max-w-xs px-4 py-3">
                    <Link
                      href={`/posts/${post.id}`}
                      className={`font-medium underline-offset-2 hover:underline ${
                        post.status === "hidden"
                          ? "text-zinc-400"
                          : "text-zinc-900"
                      }`}
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {post.category ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {post.likes ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {new Date(post.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleStatusButton
                      id={post.id}
                      type="post"
                      currentStatus={
                        post.status === "hidden" ? "hidden" : "published"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPosts.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              該当する投稿なし
            </p>
          )}
        </div>
      </section>

      {/* Reports */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          通報{" "}
          <span className="ml-1 text-sm font-normal text-zinc-500">
            ({reports.length}件)
          </span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">対象</th>
                <th className="px-4 py-3">対象ID</th>
                <th className="px-4 py-3">理由</th>
                <th className="px-4 py-3">補足</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {reports.map((report) => {
                const postId =
                  report.target_type === "post"
                    ? report.target_id
                    : (replyPostMap.get(report.target_id) ?? null);
                return (
                  <tr key={report.id} className="hover:bg-zinc-50/70">
                    <td className="px-4 py-3 text-zinc-400">{report.id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          report.target_type === "post"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {report.target_type === "post" ? "投稿" : "返信"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {postId !== null ? (
                        <Link
                          href={`/posts/${postId}`}
                          className="text-blue-600 underline-offset-2 hover:underline"
                        >
                          {report.target_id}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">{report.target_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {REASON_LABELS[report.reason] ?? report.reason}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-zinc-500">
                      {report.description ? (
                        <span className="line-clamp-2">
                          {report.description}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                      {new Date(report.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <ReportStatusButton
                        id={report.id}
                        currentStatus={
                          report.status === "resolved"
                            ? "resolved"
                            : report.status === "dismissed"
                              ? "dismissed"
                              : "open"
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {reports.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              通報なし
            </p>
          )}
        </div>
      </section>

      {/* Replies */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            返信{" "}
            <span className="ml-1 text-sm font-normal text-zinc-500">
              ({filteredReplies.length}/{replies.length}件)
            </span>
          </h2>
          <FilterTabs
            options={REPLY_STATUS_OPTIONS}
            paramKey="replyStatus"
            current={replyFilter}
            currentParams={currentParams}
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Post ID</th>
                <th className="px-4 py-3">内容</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Likes</th>
                <th className="px-4 py-3">日時</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredReplies.map((reply) => (
                <tr
                  key={reply.id}
                  className={
                    reply.status === "hidden"
                      ? "bg-red-50/40 hover:bg-red-50/60"
                      : "hover:bg-zinc-50/70"
                  }
                >
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
                  <td className="px-4 py-3">
                    <StatusBadge status={reply.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {reply.likes}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {new Date(reply.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3">
                    <ToggleStatusButton
                      id={reply.id}
                      type="reply"
                      currentStatus={
                        reply.status === "hidden" ? "hidden" : "published"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredReplies.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              該当する返信なし
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
