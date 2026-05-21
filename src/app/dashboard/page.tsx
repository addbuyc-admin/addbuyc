import Link from "next/link";
import { Fragment } from "react";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";
import { ToggleBestAnswerButton } from "@/components/ToggleBestAnswerButton";
import { ReportStatusButton } from "@/components/ReportStatusButton";
import { ReportNoteEditor } from "@/components/ReportNoteEditor";
import { LinkedText } from "@/components/LinkedText";

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
  image_url: string | null;
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
  image_url: string | null;
  is_best_answer: boolean;
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
  admin_note: string | null;
  handled_at: string | null;
};

type UserStatRow = {
  user_id: string;
  display_name: string | null;
  post_count: number;
  reply_count: number;
  total_reply_likes: number;
  best_answer_count: number;
};

async function getPosts(): Promise<PostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      "id, title, description, image_url, category, likes, created_at, target_url, status",
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
    .select(
      "id, target_type, target_id, reason, description, created_at, status, admin_note, handled_at",
    )
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
    .select("id, post_id, description, image_url, is_best_answer, likes, created_at, status")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load replies:", error.message);
    return [];
  }
  return (data ?? []) as ReplyRow[];
}

async function getUserStats(): Promise<UserStatRow[]> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("user_id, display_name, post_count, reply_count, total_reply_likes, best_answer_count")
    .order("best_answer_count", { ascending: false })
    .order("total_reply_likes", { ascending: false })
    .order("reply_count", { ascending: false })
    .order("post_count", { ascending: false });
  if (error) {
    console.error("Dashboard: failed to load user stats:", error.message);
    return [];
  }
  return (data ?? []) as UserStatRow[];
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
      {status === "published" ? "表示中" : "非表示"}
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
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Link
          key={opt.value}
          href={buildFilterHref(currentParams, paramKey, opt.value)}
          scroll={false}
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
  { value: "published", label: "表示中" },
  { value: "hidden", label: "非表示" },
];

const REPLY_STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "表示中" },
  { value: "hidden", label: "非表示" },
];

const REPORT_STATUS_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "open", label: "未対応" },
  { value: "resolved", label: "対応済み" },
  { value: "dismissed", label: "対応不要" },
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
  const reportFilter =
    typeof resolvedParams.reportStatus === "string"
      ? resolvedParams.reportStatus
      : "all";

  const currentParams: Record<string, string> = {};
  if (postFilter !== "all") currentParams.postStatus = postFilter;
  if (replyFilter !== "all") currentParams.replyStatus = replyFilter;
  if (reportFilter !== "all") currentParams.reportStatus = reportFilter;

  const [posts, replies, reports, userStats] = await Promise.all([
    getPosts(),
    getReplies(),
    getReports(),
    getUserStats(),
  ]);

  // reply の id → post_id マップ（通報リンク修正用）
  const replyPostMap = new Map<number, number>(
    replies.map((r) => [r.id, r.post_id]),
  );

  // サマリー集計（フィルター前の全データ）
  const openReports = reports.filter((r) => r.status === "open").length;
  const hiddenPosts = posts.filter((p) => p.status === "hidden").length;
  const hiddenReplies = replies.filter((r) => r.status === "hidden").length;

  // フィルター適用後のリスト
  const filteredPosts =
    postFilter === "all" ? posts : posts.filter((p) => p.status === postFilter);
  const filteredReplies =
    replyFilter === "all"
      ? replies
      : replies.filter((r) => r.status === replyFilter);
  const filteredReports =
    reportFilter === "all"
      ? reports
      : reports.filter((r) => r.status === reportFilter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
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

      {/* Reports */}
      <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            通報{" "}
            <span className="ml-1 text-sm font-normal text-zinc-500">
              ({filteredReports.length}/{reports.length}件)
            </span>
          </h2>
          <FilterTabs
            options={REPORT_STATUS_OPTIONS}
            paramKey="reportStatus"
            current={reportFilter}
            currentParams={currentParams}
          />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="w-12 px-4 py-3">ID</th>
                <th className="w-14 px-4 py-3">対象</th>
                <th className="w-16 px-4 py-3">対象ID</th>
                <th className="w-28 px-4 py-3">理由</th>
                <th className="min-w-[120px] px-4 py-3">補足</th>
                <th className="w-20 px-4 py-3">状態</th>
                <th className="w-40 px-4 py-3">通報日時</th>
                <th className="w-40 px-4 py-3">対応日時</th>
                <th className="w-36 px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => {
                const isOpen = report.status === "open";
                const postId =
                  report.target_type === "post"
                    ? report.target_id
                    : (replyPostMap.get(report.target_id) ?? null);
                return (
                  <Fragment key={report.id}>
                    {/* データ行 */}
                    <tr
                      className={`border-t border-zinc-100 ${
                        isOpen
                          ? "bg-amber-50/40 hover:bg-amber-50/60"
                          : "hover:bg-zinc-50/70"
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {report.id}
                      </td>
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
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline-offset-2 hover:underline"
                          >
                            {report.target_id}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">
                            {report.target_id}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </td>
                      <td className="px-4 py-3">
                        {report.description ? (
                          <span className="line-clamp-2 text-xs text-zinc-500">
                            {report.description}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ReportStatusBadge status={report.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                        {formatDateTime(report.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                        {report.handled_at ? (
                          formatDateTime(report.handled_at)
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
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
                    {/* 管理メモ行 */}
                    <tr
                      className={`border-b ${
                        isOpen
                          ? "border-amber-100 bg-amber-50/20"
                          : "border-zinc-100 bg-zinc-50/50"
                      }`}
                    >
                      <td colSpan={9} className="px-4 pb-3 pt-1">
                        <ReportNoteEditor
                          id={report.id}
                          initialNote={report.admin_note}
                        />
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredReports.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              該当する通報なし
            </p>
          )}
        </div>
      </section>

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
                <th className="w-12 px-4 py-3">ID</th>
                <th className="min-w-[180px] px-4 py-3">タイトル</th>
                <th className="w-24 px-4 py-3">カテゴリ</th>
                <th className="w-20 px-4 py-3">状態</th>
                <th className="w-14 px-4 py-3 text-right">♥</th>
                <th className="w-40 px-4 py-3">投稿日時</th>
                <th className="w-28 px-4 py-3">操作</th>
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
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {post.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {post.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.image_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      )}
                      <Link
                        href={`/posts/${post.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`font-medium underline-offset-2 hover:underline ${
                          post.status === "hidden"
                            ? "text-zinc-400"
                            : "text-zinc-900"
                        }`}
                      >
                        {post.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {post.category ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {post.likes ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {formatDateTime(post.created_at)}
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

      {/* Replies */}
      <section className="mb-12">
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
                <th className="w-12 px-4 py-3">ID</th>
                <th className="w-16 px-4 py-3">投稿</th>
                <th className="min-w-[200px] px-4 py-3">内容</th>
                <th className="w-20 px-4 py-3">状態</th>
                <th className="w-14 px-4 py-3 text-right">♥</th>
                <th className="w-40 px-4 py-3">投稿日時</th>
                <th className="w-28 px-4 py-3">操作</th>
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
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {reply.id}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/posts/${reply.post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline-offset-2 hover:underline"
                    >
                      {reply.post_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      {reply.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={reply.image_url}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      )}
                      <span className="line-clamp-2 text-xs text-zinc-700">
                        <LinkedText text={reply.description} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={reply.status} />
                      {reply.is_best_answer && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/badges/best-answer01.png"
                          alt="ベストアンサー"
                          className="h-12 w-auto object-contain"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {reply.likes}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                    {formatDateTime(reply.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <ToggleStatusButton
                        id={reply.id}
                        type="reply"
                        currentStatus={
                          reply.status === "hidden" ? "hidden" : "published"
                        }
                      />
                      <ToggleBestAnswerButton
                        replyId={reply.id}
                        postId={reply.post_id}
                        isBestAnswer={reply.is_best_answer}
                      />
                    </div>
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

      {/* ユーザー実績 */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            ユーザー実績{" "}
            <span className="ml-1 text-sm font-normal text-zinc-500">
              ({userStats.length}件)
            </span>
          </h2>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <th className="min-w-[160px] px-4 py-3">表示名</th>
                <th className="w-20 px-4 py-3 text-right">投稿数</th>
                <th className="w-20 px-4 py-3 text-right">返信数</th>
                <th className="w-24 px-4 py-3 text-right">返信Like計</th>
                <th className="w-32 px-4 py-3 text-right">ベストアンサー</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {userStats.map((stat) => (
                <tr key={stat.user_id} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-3 text-xs text-zinc-700">
                    {stat.display_name ?? (
                      <span className="text-zinc-400">未設定</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-700">
                    {stat.post_count}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-700">
                    {stat.reply_count}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-700">
                    {stat.total_reply_likes}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">
                    {stat.best_answer_count > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                        {stat.best_answer_count}
                      </span>
                    ) : (
                      <span className="text-zinc-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {userStats.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              ユーザー実績はまだありません
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
