import Link from "next/link";
import { Fragment } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { ToggleStatusButton } from "@/components/ToggleStatusButton";
import { ToggleBestAnswerButton } from "@/components/ToggleBestAnswerButton";
import { ReportStatusButton } from "@/components/ReportStatusButton";
import { ReportNoteEditor } from "@/components/ReportNoteEditor";
import { LinkedText } from "@/components/LinkedText";
import { getAdvisorRank } from "@/lib/advisor-rank";

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


type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function getPosts(supabase: SupabaseClient): Promise<PostRow[]> {
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

async function getReports(supabase: SupabaseClient): Promise<ReportRow[]> {
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

async function getReplies(supabase: SupabaseClient): Promise<ReplyRow[]> {
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

async function getUserStats(supabase: SupabaseClient): Promise<UserStatRow[]> {
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

function buildTabHref(tab: string, current: Record<string, string>): string {
  const p = new URLSearchParams(current);
  if (tab === "all") p.delete("tab");
  else p.set("tab", tab);
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
  const rawTab = typeof resolvedParams.tab === "string" ? resolvedParams.tab : null;
  const activeTab: "posts" | "replies" | "reports" | "all" =
    ["posts", "replies", "reports"].includes(rawTab ?? "")
      ? (rawTab as "posts" | "replies" | "reports")
      : "all";

  const showPosts    = activeTab === "all" || activeTab === "posts";
  const showReplies  = activeTab === "all" || activeTab === "replies";
  const showReports  = activeTab === "all" || activeTab === "reports";
  const showUserStats = activeTab === "all";

  const currentParams: Record<string, string> = {};
  if (activeTab !== "all") currentParams.tab = activeTab;
  if (postFilter !== "all") currentParams.postStatus = postFilter;
  if (replyFilter !== "all") currentParams.replyStatus = replyFilter;
  if (reportFilter !== "all") currentParams.reportStatus = reportFilter;

  const supabase = await createSupabaseServerClient();
  const [posts, replies, reports, rawUserStats] = await Promise.all([
    getPosts(supabase),
    getReplies(supabase),
    getReports(supabase),
    getUserStats(supabase),
  ]);

  const userStats = [...rawUserStats].sort((a, b) => {
    const priorityA = getAdvisorRank(a)?.priority ?? 0;
    const priorityB = getAdvisorRank(b)?.priority ?? 0;
    if (priorityB !== priorityA) return priorityB - priorityA;
    if (b.best_answer_count !== a.best_answer_count) return b.best_answer_count - a.best_answer_count;
    if (b.total_reply_likes !== a.total_reply_likes) return b.total_reply_likes - a.total_reply_likes;
    if (b.reply_count !== a.reply_count) return b.reply_count - a.reply_count;
    return b.post_count - a.post_count;
  });

  // reply の id → post_id マップ（通報リンク修正用）
  const replyPostMap = new Map<number, number>(
    replies.map((r) => [r.id, r.post_id]),
  );

  // reports 行から対象コンテンツ・ステータスを参照するためのマップ
  const postMap = new Map<number, PostRow>(posts.map((p) => [p.id, p]));
  const replyMap = new Map<number, ReplyRow>(replies.map((r) => [r.id, r]));

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
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (a.status === "open" && b.status !== "open") return -1;
    if (a.status !== "open" && b.status === "open") return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
        <div className="flex items-center gap-3">
          <Link href="/" aria-label="Home" className="text-zinc-600 transition hover:text-zinc-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              ログアウト
            </button>
          </form>
        </div>
      </div>

      {/* メインタブ */}
      <div className="mb-8 flex flex-wrap gap-2">
        {(
          [
            { value: "all",     label: "すべて" },
            { value: "posts",   label: "投稿" },
            { value: "replies", label: "返信" },
            { value: "reports", label: "通報" },
          ] as const
        ).map(({ value, label }) => (
          <Link
            key={value}
            href={buildTabHref(value, currentParams)}
            scroll={false}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === value
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {label}
            {value === "reports" && openReports > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {openReports}
              </span>
            )}
          </Link>
        ))}
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
      {showReports && <section className="mb-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">
            通報{" "}
            <span className="ml-1 text-sm font-normal text-zinc-500">
              ({sortedReports.length}/{reports.length}件)
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
                <th className="min-w-[180px] px-4 py-3">対象内容</th>
                <th className="w-36 px-4 py-3">対象状態</th>
                <th className="w-28 px-4 py-3">理由</th>
                <th className="min-w-[100px] px-4 py-3">補足</th>
                <th className="w-20 px-4 py-3">通報状態</th>
                <th className="w-40 px-4 py-3">通報日時</th>
                <th className="w-44 px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedReports.map((report) => {
                const isOpen = report.status === "open";
                const postId =
                  report.target_type === "post"
                    ? report.target_id
                    : (replyPostMap.get(report.target_id) ?? null);
                const targetPost =
                  report.target_type === "post"
                    ? (postMap.get(report.target_id) ?? null)
                    : null;
                const targetReply =
                  report.target_type === "reply"
                    ? (replyMap.get(report.target_id) ?? null)
                    : null;
                const targetStatus: "published" | "hidden" | null =
                  report.target_type === "post"
                    ? (targetPost ? (targetPost.status === "hidden" ? "hidden" : "published") : null)
                    : (targetReply ? (targetReply.status === "hidden" ? "hidden" : "published") : null);
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
                      {/* 対象内容 */}
                      <td className="px-4 py-3">
                        {report.target_type === "post" ? (
                          postId !== null ? (
                            <Link
                              href={`/posts/${postId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="line-clamp-2 text-xs font-medium text-zinc-700 underline-offset-2 hover:text-zinc-900 hover:underline"
                            >
                              {targetPost?.title ?? `投稿 #${report.target_id}`}
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-400">
                              投稿 #{report.target_id}
                            </span>
                          )
                        ) : (
                          <div className="space-y-1">
                            <p className="line-clamp-2 text-xs text-zinc-600">
                              {targetReply
                                ? targetReply.description.slice(0, 80)
                                : `返信 #${report.target_id}`}
                            </p>
                            {postId !== null && (
                              <Link
                                href={`/posts/${postId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline-offset-2 hover:underline"
                              >
                                投稿を見る →
                              </Link>
                            )}
                          </div>
                        )}
                      </td>
                      {/* 対象状態 */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          {targetStatus !== null ? (
                            <>
                              <StatusBadge status={targetStatus} />
                              <ToggleStatusButton
                                id={report.target_id}
                                type={report.target_type as "post" | "reply"}
                                currentStatus={targetStatus}
                              />
                            </>
                          ) : (
                            <span className="text-xs text-zinc-300">—</span>
                          )}
                        </div>
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
          {sortedReports.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              {reportFilter === "open" ? "未対応の通報はありません" : "該当する通報なし"}
            </p>
          )}
        </div>
      </section>}

      {/* Posts */}
      {showPosts && <section className="mb-12">
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
      </section>}

      {/* Replies */}
      {showReplies && <section className="mb-12">
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
      </section>}

      {/* ユーザー実績 */}
      {showUserStats && <section>
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
                <th className="w-36 px-4 py-3">アドバイザーランク</th>
                <th className="w-20 px-4 py-3 text-right">投稿数</th>
                <th className="w-20 px-4 py-3 text-right">返信数</th>
                <th className="w-24 px-4 py-3 text-right">返信Like計</th>
                <th className="w-32 px-4 py-3 text-right">ベストアンサー</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {userStats.map((stat) => {
                const rank = getAdvisorRank(stat);
                return (
                <tr key={stat.user_id} className="hover:bg-zinc-50/70">
                  <td className="px-4 py-3 text-xs text-zinc-700">
                    {stat.display_name ?? (
                      <span className="text-zinc-400">未設定</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rank !== null ? (
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rank.className}`}>
                        {rank.label}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
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
                );
              })}
            </tbody>
          </table>
          {userStats.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-zinc-400">
              ユーザー実績はまだありません
            </p>
          )}
        </div>
      </section>}
    </div>
  );
}
