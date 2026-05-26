"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { useEffect, useState } from "react";
import { usePosts } from "@/context/PostsProvider";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { LinkedText } from "@/components/LinkedText";
import type { Post } from "@/lib/types";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ReportButton } from "@/components/ReportButton";
import { getAdvisorRank, type AdvisorRankInfo } from "@/lib/advisor-rank";
import { AdvisorRankBadge } from "@/components/AdvisorRankBadge";
import { AvatarIcon } from "@/components/AvatarIcon";
import { PostStatusBadge } from "@/components/PostStatusBadge";

const VALID_CATEGORIES: Set<string> = new Set(CATEGORIES.map((c) => c.slug));

function toCategory(value: string | null): CategorySlug {
  if (value && VALID_CATEGORIES.has(value)) return value as CategorySlug;
  return "other";
}

type UserStat = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  post_count: number;
  reply_count: number;
  total_reply_likes: number;
  best_answer_count: number;
};

function resolveDisplayName(userId: string | null, map: Map<string, UserStat>): string {
  if (!userId) return "ゲストユーザー";
  const stat = map.get(userId);
  if (!stat) return "ユーザー";
  return stat.display_name?.trim() || stat.username?.trim() || "ユーザー";
}

function resolveUsername(userId: string | null, map: Map<string, UserStat>): string | null {
  if (!userId) return null;
  return map.get(userId)?.username?.trim() || null;
}

function resolveAvatarUrl(userId: string | null, map: Map<string, UserStat>): string | null {
  if (!userId) return null;
  return map.get(userId)?.avatar_url ?? null;
}

function resolveAdvisorRank(userId: string | null, map: Map<string, UserStat>): AdvisorRankInfo | null {
  if (!userId) return null;
  const stat = map.get(userId);
  if (!stat) return null;
  const hasIdentity = stat.display_name?.trim() || stat.username?.trim();
  if (!hasIdentity) return null;
  return getAdvisorRank(stat);
}

type PostRow = {
  id: number | string;
  title: string;
  description: string;
  image_url: string | null;
  likes: number | null;
  created_at: string;
  category: string | null;
  target_url: string | null;
  status: string | null;
};

function mapRowToPost(row: PostRow): Post {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    likes: typeof row.likes === "number" ? row.likes : 0,
    createdAt: row.created_at,
    category: toCategory(row.category),
    targetUrl: row.target_url,
    status: row.status === "hidden" ? "hidden" : "published",
    hasBestAnswer: false,
  };
}

type Reply = {
  id: string;
  postId: string;
  description: string;
  imageUrl: string | null;
  isBestAnswer: boolean;
  likes: number;
  createdAt: string;
  userId: string | null;
};

type ReplyRow = {
  id: number | string;
  post_id: number | string;
  description: string;
  image_url: string | null;
  is_best_answer: boolean;
  likes: number;
  created_at: string;
  user_id?: string | null;
};

function mapRowToReply(row: ReplyRow): Reply {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    description: row.description,
    imageUrl: row.image_url ?? null,
    isBestAnswer: row.is_best_answer ?? false,
    likes: row.likes,
    createdAt: row.created_at,
    userId: row.user_id ?? null,
  };
}

function toDbId(id: string) {
  return /^\d+$/.test(id) ? Number(id) : id;
}

const LIKED_POSTS_KEY = "addbuyc_liked_posts";
const LIKED_REPLIES_KEY = "addbuyc_liked_replies";

function readLikedSet(key: string) {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map((id) => String(id)));
  } catch {
    return new Set<string>();
  }
}

function writeLikedSet(key: string, values: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(values)));
}

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { likePost, refetchPosts } = usePosts();
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [postUserId, setPostUserId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [replyImageFile, setReplyImageFile] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [replyImageFileName, setReplyImageFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [modalSrc, setModalSrc] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<Map<string, UserStat>>(new Map());
  // 投稿編集
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTargetUrl, setEditTargetUrl] = useState("");
  const [editCategory, setEditCategory] = useState<CategorySlug>("other");
  const [editPostError, setEditPostError] = useState<string | null>(null);
  const [savingPost, setSavingPost] = useState(false);
  // 返信編集
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyBody, setEditReplyBody] = useState("");
  const [editReplyError, setEditReplyError] = useState<string | null>(null);
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  // ベストアンサー
  const [settingBestAnswer, setSettingBestAnswer] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.id) {
      void (async () => {
        const [{ data: postLikesData }, { data: replyLikesData }] = await Promise.all([
          supabase.from("post_likes").select("post_id"),
          supabase.from("reply_likes").select("reply_id"),
        ]);
        setLikedPosts(new Set((postLikesData ?? []).map((r) => String((r as { post_id: number }).post_id))));
        setLikedReplies(new Set((replyLikesData ?? []).map((r) => String((r as { reply_id: number }).reply_id))));
      })();
    } else {
      setLikedPosts(readLikedSet(LIKED_POSTS_KEY));
      setLikedReplies(readLikedSet(LIKED_REPLIES_KEY));
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!modalSrc) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setModalSrc(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalSrc]);

  useEffect(() => {
    const postId = params.id;
    if (!postId) {
      setError("Post ID is missing.");
      setLoading(false);
      return;
    }

    void (async () => {
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, likes, created_at, category, target_url, status, user_id")
        .eq("id", toDbId(postId))
        .single();

      if (postError) {
        if (postError.code === "PGRST116") {
          setPost(null);
          setError("Post not found.");
        } else {
          setError("Failed to load post.");
        }
        setLoading(false);
        return;
      }

      const rawPost = postData as PostRow & { user_id: string | null };
      const mappedPost = mapRowToPost(rawPost);
      if (mappedPost.status === "hidden") {
        setError("この投稿は現在表示できません。");
        setLoading(false);
        return;
      }

      const { data: repliesData, error: repliesError } = await supabase
        .from("replies")
        .select("id, post_id, description, image_url, is_best_answer, likes, created_at, user_id")
        .eq("post_id", toDbId(postId))
        .eq("status", "published")
        .order("created_at", { ascending: true });

      if (repliesError) {
        setReplyError("Failed to load replies.");
      } else {
        const mapped = (repliesData ?? []).map((row) => mapRowToReply(row as ReplyRow));
        // ベストアンサーを先頭に、それ以外は投稿日時昇順を維持
        mapped.sort((a, b) => {
          if (a.isBestAnswer && !b.isBestAnswer) return -1;
          if (!a.isBestAnswer && b.isBestAnswer) return 1;
          return 0;
        });
        setReplies(mapped);
      }

      // 投稿・返信に紐づく user_id を収集
      const userIds = [
        rawPost.user_id,
        ...((repliesData ?? []).map((r) => (r as ReplyRow & { user_id?: string | null }).user_id ?? null)),
      ].filter((id): id is string => !!id);
      const uniqueIds = [...new Set(userIds)];

      if (uniqueIds.length > 0) {
        // display_name は profiles から直接取得（信頼性優先）
        // ランク用の集計値は user_stats から取得
        const [profilesResult, statsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .in("id", uniqueIds),
          supabase
            .from("user_stats")
            .select("user_id, post_count, reply_count, total_reply_likes, best_answer_count")
            .in("user_id", uniqueIds),
        ]);

        const profileMap = new Map(
          ((profilesResult.data ?? []) as { id: string; display_name: string | null; username: string | null; avatar_url: string | null }[])
            .map((p) => [p.id, { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url }]),
        );
        const rankMap = new Map(
          ((statsResult.data ?? []) as Omit<UserStat, "display_name" | "username" | "avatar_url">[])
            .map((s) => [s.user_id, s]),
        );

        const merged = new Map<string, UserStat>(
          uniqueIds.map((id) => [
            id,
            {
              user_id: id,
              display_name: profileMap.get(id)?.display_name ?? null,
              username: profileMap.get(id)?.username ?? null,
              avatar_url: profileMap.get(id)?.avatar_url ?? null,
              post_count: rankMap.get(id)?.post_count ?? 0,
              reply_count: rankMap.get(id)?.reply_count ?? 0,
              total_reply_likes: rankMap.get(id)?.total_reply_likes ?? 0,
              best_answer_count: rankMap.get(id)?.best_answer_count ?? 0,
            },
          ]),
        );
        setUserStats(merged);
      }

      setPost(mappedPost);
      setPostUserId(rawPost.user_id ?? null);
      setLoading(false);
    })();
  }, [params.id]);

  async function handleLikePost() {
    if (!post) return;
    const postId = String(post.id);
    if (user?.id && postUserId && user.id === postUserId) return;

    if (user?.id) {
      // ログインユーザー: Like/Unlike トグル
      const isAlreadyLiked = likedPosts.has(postId);
      const persistedLikes = await likePost(postId, isAlreadyLiked);
      if (persistedLikes === null) {
        console.error("Failed to like/unlike post:", postId);
        return;
      }
      setPost((prev) => (prev ? { ...prev, likes: persistedLikes } : prev));
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (isAlreadyLiked) next.delete(postId);
        else next.add(postId);
        return next;
      });
    } else {
      // ゲスト: Like のみ（解除不可）
      if (likedPosts.has(postId)) return;
      const persistedLikes = await likePost(postId);
      if (persistedLikes === null) {
        console.error("Failed to like post:", postId);
        return;
      }
      setPost((prev) => (prev ? { ...prev, likes: persistedLikes } : prev));
      setLikedPosts((prev) => {
        const next = new Set(prev);
        next.add(postId);
        writeLikedSet(LIKED_POSTS_KEY, next);
        return next;
      });
    }
  }

  async function handleLikeReply(replyId: string) {
    const target = replies.find((reply) => reply.id === replyId);
    if (!target) return;
    if (user?.id && target.userId && user.id === target.userId) return;

    if (user?.id) {
      // ログインユーザー: Like/Unlike トグル
      const isAlreadyLiked = likedReplies.has(replyId);
      const optimisticLikes = isAlreadyLiked ? target.likes - 1 : target.likes + 1;
      setReplies((prev) =>
        prev.map((r) => r.id === replyId ? { ...r, likes: optimisticLikes } : r),
      );

      let dbError;
      if (!isAlreadyLiked) {
        const { error } = await supabase
          .from("reply_likes")
          .insert({ reply_id: toDbId(replyId), user_id: user.id });
        dbError = error;
      } else {
        const { error } = await supabase
          .from("reply_likes")
          .delete()
          .eq("reply_id", toDbId(replyId))
          .eq("user_id", user.id);
        dbError = error;
      }

      if (dbError) {
        console.error("Failed to like/unlike reply:", dbError.message);
        setReplies((prev) =>
          prev.map((r) => r.id === replyId ? { ...r, likes: target.likes } : r),
        );
        return;
      }

      // trigger が replies.likes を更新済み → 実数を取得
      const { data: refreshed } = await supabase
        .from("replies")
        .select("likes")
        .eq("id", toDbId(replyId))
        .maybeSingle();
      const actualLikes =
        typeof (refreshed as { likes?: number | null } | null)?.likes === "number"
          ? (refreshed as { likes: number }).likes
          : optimisticLikes;
      setReplies((prev) =>
        prev.map((r) => r.id === replyId ? { ...r, likes: actualLikes } : r),
      );

      setLikedReplies((prev) => {
        const next = new Set(prev);
        if (isAlreadyLiked) next.delete(replyId);
        else next.add(replyId);
        return next;
      });
    } else {
      // ゲスト: Like のみ（解除不可）
      if (likedReplies.has(replyId)) return;
      const nextLikes = target.likes + 1;
      setReplies((prev) =>
        prev.map((r) => r.id === replyId ? { ...r, likes: nextLikes } : r),
      );
      const { error: likeError } = await supabase
        .from("replies")
        .update({ likes: nextLikes })
        .eq("id", toDbId(replyId));
      if (likeError) {
        console.error("Failed to like reply:", likeError.message);
        setReplies((prev) =>
          prev.map((r) => r.id === replyId ? { ...r, likes: target.likes } : r),
        );
        return;
      }
      setLikedReplies((prev) => {
        const next = new Set(prev);
        next.add(replyId);
        writeLikedSet(LIKED_REPLIES_KEY, next);
        return next;
      });
    }
  }

  function onReplyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setReplyError(null);
    if (!file) {
      setReplyImageFile(null);
      setReplyImagePreview(null);
      setReplyImageFileName(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setReplyError("画像ファイルを選択してください。");
      setReplyImageFile(null);
      setReplyImagePreview(null);
      setReplyImageFileName(null);
      return;
    }
    setReplyImageFile(file);
    setReplyImageFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string") setReplyImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  function clearReplyImage() {
    setReplyImageFile(null);
    setReplyImagePreview(null);
    setReplyImageFileName(null);
  }

  async function handleDeletePost() {
    if (!post || !user?.id || deletingPost) return;
    const confirmed = window.confirm(
      "この投稿を削除しますか？削除すると一覧や詳細画面には表示されなくなります。",
    );
    if (!confirmed) return;
    setDeletingPost(true);
    const { error: deleteError } = await supabase
      .from("posts")
      .update({ status: "hidden" })
      .eq("id", toDbId(String(post.id)))
      .eq("user_id", user.id);
    if (deleteError) {
      console.error("Failed to delete post:", deleteError.message);
      alert("投稿の削除に失敗しました。しばらくしてから再度お試しください。");
      setDeletingPost(false);
      return;
    }
    await refetchPosts();
    router.push("/posts");
  }

  async function handleDeleteReply(replyId: string) {
    if (!user?.id || deletingReplyId) return;
    const confirmed = window.confirm(
      "この返信を削除しますか？削除すると画面には表示されなくなります。",
    );
    if (!confirmed) return;
    setDeletingReplyId(replyId);
    const { error: deleteError } = await supabase
      .from("replies")
      .update({ status: "hidden" })
      .eq("id", toDbId(replyId))
      .eq("user_id", user.id);
    if (deleteError) {
      console.error("Failed to delete reply:", deleteError.message);
      alert("返信の削除に失敗しました。しばらくしてから再度お試しください。");
      setDeletingReplyId(null);
      return;
    }
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setDeletingReplyId(null);
  }

  async function handleReplySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = replyBody.trim();
    if (!body) {
      setReplyError("返信内容を入力してください。");
      return;
    }
    if (!post) return;
    setReplyError(null);
    setSubmittingReply(true);

    let uploadedImageUrl: string | null = null;
    if (replyImageFile) {
      try {
        const blob = await compressImage(replyImageFile);
        const fileName = `replies/${crypto.randomUUID()}.webp`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, blob, { contentType: "image/webp", upsert: false });
        if (uploadError) {
          setReplyError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
          setSubmittingReply(false);
          return;
        }
        const { data: urlData } = supabase.storage
          .from("post-images")
          .getPublicUrl(uploadData.path);
        uploadedImageUrl = urlData.publicUrl;
      } catch (err) {
        if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
          setReplyError("圧縮後も画像が2MBを超えています。より小さい画像を選んでください。");
        } else {
          setReplyError("画像の処理に失敗しました。別の画像をお試しください。");
        }
        setSubmittingReply(false);
        return;
      }
    }

    const { data, error: insertError } = await supabase
      .from("replies")
      .insert({
        post_id: toDbId(String(post.id)),
        description: body,
        image_url: uploadedImageUrl,
        likes: 0,
        user_id: user?.id ?? null,
      })
      .select("id, post_id, description, image_url, likes, created_at, user_id")
      .single();

    if (insertError) {
      console.error("Failed to post reply:", insertError.message);
      setReplyError("返信の投稿に失敗しました。");
      setSubmittingReply(false);
      return;
    }

    // 返信投稿者が userStats 未登録の場合（ページ読み込み後初めて返信するケース）、
    // setReplies より先にプロフィールを取得して追加する。
    // React 18 の automatic batching により setUserStats + setReplies は1回の再レンダーにまとまるため、
    // 新規返信が画面に追加される時点で表示名が解決済みになる。
    if (user?.id && !userStats.has(user.id)) {
      const [profileRes, statsRes] = await Promise.all([
        supabase.from("profiles").select("display_name, username, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("user_stats").select("user_id, post_count, reply_count, total_reply_likes, best_answer_count").eq("user_id", user.id).maybeSingle(),
      ]);
      const profileData = profileRes.data as { display_name: string | null; username: string | null; avatar_url: string | null } | null;
      const statsData = statsRes.data as { post_count: number; reply_count: number; total_reply_likes: number; best_answer_count: number } | null;
      setUserStats((prev) => {
        const next = new Map(prev);
        next.set(user.id, {
          user_id: user.id,
          display_name: profileData?.display_name ?? null,
          username: profileData?.username ?? null,
          avatar_url: profileData?.avatar_url ?? null,
          post_count: statsData?.post_count ?? 0,
          reply_count: statsData?.reply_count ?? 0,
          total_reply_likes: statsData?.total_reply_likes ?? 0,
          best_answer_count: statsData?.best_answer_count ?? 0,
        });
        return next;
      });
    }

    setReplies((prev) => [...prev, mapRowToReply(data as ReplyRow)]);
    setReplyBody("");
    clearReplyImage();
    setSubmittingReply(false);
  }

  function handleEditPost() {
    if (!post) return;
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditTargetUrl(post.targetUrl ?? "");
    setEditCategory(post.category);
    setEditPostError(null);
    setEditingPost(true);
  }

  function handleCancelEditPost() {
    setEditingPost(false);
    setEditPostError(null);
  }

  async function handleSavePost() {
    if (!post || !user?.id || savingPost) return;
    const title = editTitle.trim();
    const description = editDescription.trim();
    const targetUrl = editTargetUrl.trim() || null;
    if (!title) { setEditPostError("タイトルを入力してください"); return; }
    if (!description) { setEditPostError("相談内容を入力してください"); return; }
    setEditPostError(null);
    setSavingPost(true);
    const { error: updateError } = await supabase
      .from("posts")
      .update({ title, description, target_url: targetUrl, category: editCategory })
      .eq("id", toDbId(String(post.id)))
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Failed to update post:", updateError.message);
      setEditPostError("保存に失敗しました。しばらくしてから再度お試しください。");
      setSavingPost(false);
      return;
    }
    setPost((prev) => prev ? { ...prev, title, description, targetUrl, category: editCategory } : prev);
    await refetchPosts();
    setEditingPost(false);
    setSavingPost(false);
  }

  function handleEditReply(replyId: string) {
    const reply = replies.find((r) => r.id === replyId);
    if (!reply) return;
    setEditReplyBody(reply.description);
    setEditReplyError(null);
    setEditingReplyId(replyId);
  }

  function handleCancelEditReply() {
    setEditingReplyId(null);
    setEditReplyError(null);
  }

  async function handleSaveReply(replyId: string) {
    if (!user?.id || savingReplyId) return;
    const body = editReplyBody.trim();
    if (!body) { setEditReplyError("返信内容を入力してください"); return; }
    setEditReplyError(null);
    setSavingReplyId(replyId);
    const { error: updateError } = await supabase
      .from("replies")
      .update({ description: body })
      .eq("id", toDbId(replyId))
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Failed to update reply:", updateError.message);
      setEditReplyError("保存に失敗しました。しばらくしてから再度お試しください。");
      setSavingReplyId(null);
      return;
    }
    setReplies((prev) => prev.map((r) => r.id === replyId ? { ...r, description: body } : r));
    setEditingReplyId(null);
    setSavingReplyId(null);
  }

  async function handleSetBestAnswer(replyId: string) {
    if (!post || !user?.id || settingBestAnswer) return;
    setSettingBestAnswer(true);
    const { error } = await supabase.rpc("set_best_answer", {
      p_reply_id: toDbId(replyId),
      p_post_id: toDbId(String(post.id)),
    });
    if (error) {
      console.error("Failed to set best answer:", error.message);
      alert("ベストアンサーの設定に失敗しました。");
      setSettingBestAnswer(false);
      return;
    }
    setReplies((prev) => {
      const updated = prev.map((r) => ({ ...r, isBestAnswer: r.id === replyId }));
      return updated.sort((a, b) => {
        if (a.isBestAnswer && !b.isBestAnswer) return -1;
        if (!a.isBestAnswer && b.isBestAnswer) return 1;
        return 0;
      });
    });
    await refetchPosts();
    setSettingBestAnswer(false);
  }

  async function handleUnsetBestAnswer() {
    if (!post || !user?.id || settingBestAnswer) return;
    setSettingBestAnswer(true);
    const { error } = await supabase.rpc("unset_best_answer", {
      p_post_id: toDbId(String(post.id)),
    });
    if (error) {
      console.error("Failed to unset best answer:", error.message);
      alert("ベストアンサーの解除に失敗しました。");
      setSettingBestAnswer(false);
      return;
    }
    setReplies((prev) => prev.map((r) => ({ ...r, isBestAnswer: false })));
    await refetchPosts();
    setSettingBestAnswer(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/posts"
        className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
      >
        ← Back to posts
      </Link>

      {loading ? (
        <div className="mt-6 h-52 animate-pulse rounded-2xl bg-zinc-100" />
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          <p className="text-zinc-600">{error}</p>
        </div>
      ) : post ? (
        <div className="mt-6 space-y-6">
          <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {/* タイトル・カテゴリ+日時+Like・対象URL・本文 / 編集フォーム */}
            {editingPost ? (
              <div className="p-6 space-y-4">
                <p className="text-sm font-semibold text-zinc-700">投稿を編集</p>
                <div className="space-y-2">
                  <label htmlFor="editTitle" className="text-sm font-medium text-zinc-800">タイトル</label>
                  <input
                    id="editTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={100}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editCategory" className="text-sm font-medium text-zinc-800">カテゴリ</label>
                  <select
                    id="editCategory"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as CategorySlug)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="editTargetUrl" className="text-sm font-medium text-zinc-800">
                    対象URL <span className="font-normal text-zinc-400">（任意）</span>
                  </label>
                  <input
                    id="editTargetUrl"
                    type="text"
                    value={editTargetUrl}
                    onChange={(e) => setEditTargetUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editDescription" className="text-sm font-medium text-zinc-800">相談内容</label>
                  <textarea
                    id="editDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={6}
                    className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
                  />
                </div>
                {editPostError && (
                  <p className="text-sm text-red-600" role="alert">{editPostError}</p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSavePost}
                    disabled={savingPost}
                    className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingPost ? "保存中…" : "保存する"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditPost}
                    disabled={savingPost}
                    className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
                  {post.title}
                </h1>
                <div className="mt-2">
                  <PostStatusBadge hasBestAnswer={replies.some((r) => r.isBestAnswer)} />
                </div>
                <div className="mt-3 border-b border-zinc-100 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={post.category} />
                      <time dateTime={post.createdAt}>
                        {formatDateTime(post.createdAt)}
                      </time>
                    </div>
                    {(() => {
                      const isPostLiked = likedPosts.has(String(post.id));
                      const isSelfLike = !!(user?.id && postUserId && user.id === postUserId);
                      return (
                        <button
                          type="button"
                          onClick={handleLikePost}
                          disabled={isSelfLike || (!user?.id && isPostLiked)}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                            isPostLiked && user?.id
                              ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100"
                              : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-500"
                          }`}
                          aria-label={`Like post: ${post.title}`}
                        >
                          <span aria-hidden className="text-base leading-none">♥</span>
                          <span>{post.likes}</span>
                        </button>
                      );
                    })()}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                    <AvatarIcon
                      avatarUrl={resolveAvatarUrl(postUserId, userStats)}
                      name={resolveDisplayName(postUserId, userStats)}
                      size={20}
                    />
                    <span>
                      投稿者：
                      {resolveUsername(postUserId, userStats) ? (
                        <Link
                          href={`/users/${resolveUsername(postUserId, userStats)}`}
                          className="underline-offset-2 hover:text-zinc-700 hover:underline"
                        >
                          {resolveDisplayName(postUserId, userStats)}
                        </Link>
                      ) : (
                        resolveDisplayName(postUserId, userStats)
                      )}
                    </span>
                  </div>
                </div>
                {post.targetUrl && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-zinc-500">対象URL</p>
                    <a
                      href={post.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block max-w-full truncate text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
                    >
                      {post.targetUrl}
                    </a>
                  </div>
                )}
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">
                  <LinkedText text={post.description} />
                </p>
              </div>
            )}

            {/* 投稿画像（クリックで拡大） */}
            {post.imageUrl && (
              <button
                type="button"
                className="block w-full cursor-zoom-in border-t border-zinc-200"
                onClick={() => setModalSrc(post.imageUrl!)}
                aria-label="画像を拡大表示"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.imageUrl}
                  alt=""
                  className="max-h-[500px] w-full object-cover"
                />
              </button>
            )}

            {/* 削除・編集・通報ボタン（編集中は非表示） */}
            {!editingPost && (
              <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
                {user?.id && postUserId && user.id === postUserId ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDeletePost}
                      disabled={deletingPost}
                      className="text-sm text-red-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingPost ? "削除中…" : "削除"}
                    </button>
                    <button
                      type="button"
                      onClick={handleEditPost}
                      className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline"
                    >
                      編集
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                {!(user?.id && postUserId && user.id === postUserId) && (
                  <ReportButton targetType="post" targetId={String(post.id)} />
                )}
              </div>
            )}
          </article>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Reply to this post
            </h2>
            <form onSubmit={handleReplySubmit} className="mt-4 space-y-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder="返信を書く…"
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={onReplyFileChange}
                  />
                  {replyImageFileName ? replyImageFileName : "画像（任意）"}
                </label>
                {replyImageFileName && (
                  <button
                    type="button"
                    onClick={clearReplyImage}
                    className="text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
                  >
                    削除
                  </button>
                )}
              </div>
              {replyImagePreview && (
                <div className="overflow-hidden rounded-xl border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={replyImagePreview}
                    alt="プレビュー"
                    className="max-h-40 w-full object-cover"
                  />
                </div>
              )}
              {replyError && (
                <p className="text-sm text-red-600" role="alert">
                  {replyError}
                </p>
              )}
              <button
                type="submit"
                disabled={submittingReply}
                className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submittingReply ? "投稿中..." : "返信する"}
              </button>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Replies
            </h2>
            {replies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-10 text-center text-sm text-zinc-500">
                No replies yet. Be the first to reply.
              </div>
            ) : (
              <ul className="space-y-3">
                {replies.map((reply) => (
                  <li
                    key={reply.id}
                    className={`rounded-2xl border bg-white p-4 shadow-sm ${
                      reply.isBestAnswer
                        ? "border-amber-200"
                        : "border-zinc-200"
                    }`}
                  >
                    <div className={`border-l-2 pl-4 ${reply.isBestAnswer ? "border-amber-300" : "border-zinc-200"}`}>
                      {reply.isBestAnswer && (
                        <div className="mb-4">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/badges/best-answer01.png"
                            alt="ベストアンサー"
                            className="h-12 w-auto object-contain"
                          />
                        </div>
                      )}
                      {editingReplyId === reply.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={editReplyBody}
                            onChange={(e) => setEditReplyBody(e.target.value)}
                            rows={4}
                            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
                          />
                          {editReplyError && (
                            <p className="text-sm text-red-600" role="alert">{editReplyError}</p>
                          )}
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSaveReply(reply.id)}
                              disabled={savingReplyId === reply.id}
                              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {savingReplyId === reply.id ? "保存中…" : "保存する"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditReply}
                              disabled={savingReplyId === reply.id}
                              className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">
                            <LinkedText text={reply.description} />
                          </p>
                          {reply.imageUrl && (
                            <button
                              type="button"
                              className="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-xl border border-zinc-200"
                              onClick={() => setModalSrc(reply.imageUrl!)}
                              aria-label="画像を拡大表示"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={reply.imageUrl}
                                alt=""
                                className="max-h-[400px] w-full object-cover"
                              />
                            </button>
                          )}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
                            <div className="flex flex-wrap items-center gap-2">
                              <AvatarIcon
                                avatarUrl={resolveAvatarUrl(reply.userId, userStats)}
                                name={resolveDisplayName(reply.userId, userStats)}
                                size={20}
                              />
                              <span className="text-xs">
                                返信者：
                                {resolveUsername(reply.userId, userStats) ? (
                                  <Link
                                    href={`/users/${resolveUsername(reply.userId, userStats)}`}
                                    className="underline-offset-2 hover:text-zinc-700 hover:underline"
                                  >
                                    {resolveDisplayName(reply.userId, userStats)}
                                  </Link>
                                ) : (
                                  resolveDisplayName(reply.userId, userStats)
                                )}
                              </span>
                              <AdvisorRankBadge rank={resolveAdvisorRank(reply.userId, userStats)} />
                              <time className="text-xs" dateTime={reply.createdAt}>
                                {formatDateTime(reply.createdAt)}
                              </time>
                            </div>
                            {(() => {
                              const isReplyLiked = likedReplies.has(reply.id);
                              const isSelfLikeReply = !!(user?.id && reply.userId && user.id === reply.userId);
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleLikeReply(reply.id)}
                                  disabled={isSelfLikeReply || (!user?.id && isReplyLiked)}
                                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                                    isReplyLiked && user?.id
                                      ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100"
                                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-500"
                                  }`}
                                  aria-label="Like reply"
                                >
                                  <span aria-hidden className="text-base leading-none">♥</span>
                                  <span>{reply.likes}</span>
                                </button>
                              );
                            })()}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {user?.id && reply.userId && user.id === reply.userId && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReply(reply.id)}
                                    disabled={deletingReplyId === reply.id}
                                    className="text-sm text-red-500 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deletingReplyId === reply.id ? "削除中…" : "削除"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditReply(reply.id)}
                                    className="text-sm text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline"
                                  >
                                    編集
                                  </button>
                                </>
                              )}
                              {user?.id && postUserId && user.id === postUserId && !(reply.userId && user.id === reply.userId) && (
                                reply.isBestAnswer ? (
                                  <button
                                    type="button"
                                    onClick={handleUnsetBestAnswer}
                                    disabled={settingBestAnswer}
                                    className="text-sm text-amber-600 transition hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {settingBestAnswer ? "処理中…" : "ベストアンサーを解除"}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetBestAnswer(reply.id)}
                                    disabled={settingBestAnswer}
                                    className="text-sm text-emerald-600 transition hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {settingBestAnswer ? "処理中…" : "ベストアンサーに選ぶ"}
                                  </button>
                                )
                              )}
                            </div>
                            {!(user?.id && reply.userId && user.id === reply.userId) && (
                              <ReportButton targetType="reply" targetId={reply.id} />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {modalSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalSrc(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalSrc(null)}
              className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-700 shadow-md transition hover:bg-zinc-100"
              aria-label="閉じる"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={modalSrc}
              alt=""
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
