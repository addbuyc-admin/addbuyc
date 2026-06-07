"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { usePosts } from "@/context/PostsProvider";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { compressImage } from "@/lib/compress-image";
import { createSafeId } from "@/lib/create-safe-id";
import { LinkedText } from "@/components/LinkedText";
import { ImageGrid } from "@/components/ImageGrid";
import type { Post } from "@/lib/types";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ReportButton } from "@/components/ReportButton";
import { getAdvisorRank, type AdvisorRankInfo } from "@/lib/advisor-rank";
import { AdvisorRankBadge } from "@/components/AdvisorRankBadge";
import { AvatarIcon } from "@/components/AvatarIcon";
import { PostStatusBadge } from "@/components/PostStatusBadge";
import { ImageEditor } from "@/components/ImageEditor";
import { LoginPrompt } from "@/components/LoginPrompt";
import { removeOwnedPostImages } from "@/lib/storage-helpers";
import { ImageLightbox } from "@/components/ImageLightbox";

const VALID_CATEGORIES: Set<string> = new Set(CATEGORIES.map((c) => c.slug));
const MAX_REPLY_IMAGES = 5;
const MAX_POST_IMAGES = 5;

function toCategory(value: string | null): CategorySlug {
  if (value && VALID_CATEGORIES.has(value)) return value as CategorySlug;
  return "other";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("read failed"));
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

function resolveImageUrls(imageUrls: string[], imageUrl: string | null): string[] {
  if (imageUrls.length > 0) return imageUrls;
  if (imageUrl) return [imageUrl];
  return [];
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

function resolveAvatarUrl(userId: string | null, map: Map<string, UserStat>): string | null {
  if (!userId) return null;
  return map.get(userId)?.avatar_url ?? null;
}

function resolveProfileHref(
  userId: string | null,
  currentUserId: string | undefined,
  map: Map<string, UserStat>,
): string | null {
  if (!userId) return null;
  if (userId === currentUserId) return "/mypage";
  const username = map.get(userId)?.username?.trim() || null;
  return username ? `/users/${username}` : null;
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
  image_urls: string[] | null;
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
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
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
  imageUrls: string[];
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
  image_urls: string[] | null;
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
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls : [],
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

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { likePost, refetchPosts } = usePosts();
  const { user, loading: authLoading } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [postUserId, setPostUserId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyBody, setReplyBody] = useState("");
  const [replyImageFiles, setReplyImageFiles] = useState<File[]>([]);
  const [replyImagePreviews, setReplyImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);
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
  // ゲスト操作時のログイン案内
  const [showLikeLoginHint, setShowLikeLoginHint] = useState(false);
  const [likeLoginHintReplyId, setLikeLoginHintReplyId] = useState<string | null>(null);
  // 投稿・返信編集フォーム内の画像
  const [editPostImageUrls, setEditPostImageUrls] = useState<string[]>([]);
  const [newPostImageFiles, setNewPostImageFiles] = useState<File[]>([]);
  const [newPostImagePreviews, setNewPostImagePreviews] = useState<string[]>([]);
  const [editReplyImageUrls, setEditReplyImageUrls] = useState<string[]>([]);
  const [newReplyImageFiles, setNewReplyImageFiles] = useState<File[]>([]);
  const [newReplyImagePreviews, setNewReplyImagePreviews] = useState<string[]>([]);
  // 通知からのリンクで特定返信をハイライト表示する
  const [highlightReplyId, setHighlightReplyId] = useState<string | null>(null);
  const didScrollToReply = useRef(false);
  // フォロー状態
  const [followedUserIds, setFollowedUserIds] = useState<Set<string>>(new Set());
  const [followActionUserId, setFollowActionUserId] = useState<string | null>(null);
  // 投稿フォロー
  const [isPostFollowing, setIsPostFollowing] = useState(false);
  const [postFollowLoading, setPostFollowLoading] = useState(false);

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
    const postId = params.id;
    if (!postId) {
      setError("Post ID is missing.");
      setLoading(false);
      return;
    }

    void (async () => {
      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("id, title, description, image_url, image_urls, likes, created_at, category, target_url, status, user_id")
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
        .select("id, post_id, description, image_url, image_urls, is_best_answer, likes, created_at, user_id")
        .eq("post_id", toDbId(postId))
        .eq("status", "published")
        .order("created_at", { ascending: true });

      if (repliesError) {
        setReplyError("Failed to load replies.");
      } else {
        const mapped = (repliesData ?? []).map((row) => mapRowToReply(row as ReplyRow));
        mapped.sort((a, b) => {
          if (a.isBestAnswer && !b.isBestAnswer) return -1;
          if (!a.isBestAnswer && b.isBestAnswer) return 1;
          return 0;
        });
        setReplies(mapped);
      }

      const userIds = [
        rawPost.user_id,
        ...((repliesData ?? []).map((r) => (r as ReplyRow & { user_id?: string | null }).user_id ?? null)),
      ].filter((id): id is string => !!id);
      const uniqueIds = [...new Set(userIds)];

      if (uniqueIds.length > 0) {
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

  // ログイン後にフォロー状態をまとめて取得
  useEffect(() => {
    if (authLoading || !user?.id || userStats.size === 0) return;
    const otherIds = [...userStats.keys()].filter((id) => id !== user.id);
    if (otherIds.length === 0) return;
    void (async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", otherIds);
      setFollowedUserIds(new Set((data ?? []).map((r) => (r as { following_id: string }).following_id)));
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, userStats.size]);

  // 投稿フォロー状態チェック
  useEffect(() => {
    if (authLoading || !user?.id || !post || !postUserId || user.id === postUserId) return;
    void (async () => {
      const { data } = await supabase
        .from("post_follows")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", toDbId(String(post.id)))
        .maybeSingle();
      setIsPostFollowing(!!data);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id, post?.id, postUserId]);

  // 通知リンク（#reply-{id}）からの遷移時にスクロール＋ハイライト
  useEffect(() => {
    if (didScrollToReply.current) return;
    if (replies.length === 0) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#reply-")) return;
    const replyId = hash.slice("#reply-".length);
    didScrollToReply.current = true;
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`reply-${replyId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightReplyId(replyId);
      setTimeout(() => setHighlightReplyId(null), 3000);
    }, 100);
    return () => clearTimeout(scrollTimer);
  }, [replies]);

  async function handleLikePost() {
    if (!post) return;
    const postId = String(post.id);
    if (user?.id && postUserId && user.id === postUserId) return;

    if (user?.id) {
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
      setShowLikeLoginHint(true);
    }
  }

  async function handleLikeReply(replyId: string) {
    const target = replies.find((reply) => reply.id === replyId);
    if (!target) return;
    if (user?.id && target.userId && user.id === target.userId) return;

    if (user?.id) {
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
      setLikeLoginHintReplyId(replyId);
    }
  }

  async function onReplyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setReplyError(null);
    if (files.length === 0) return;

    if (files.some((f) => !f.type.startsWith("image/"))) {
      setReplyError("画像ファイルを選択してください。");
      return;
    }

    const remaining = MAX_REPLY_IMAGES - replyImageFiles.length;
    if (remaining <= 0) {
      setReplyError(`画像は最大${MAX_REPLY_IMAGES}枚まで追加できます。`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setReplyError(`画像は最大${MAX_REPLY_IMAGES}枚まで追加できます。最初の${remaining}枚のみ追加しました。`);
    }

    try {
      const previews = await Promise.all(toAdd.map(readFileAsDataUrl));
      setReplyImageFiles((prev) => [...prev, ...toAdd]);
      setReplyImagePreviews((prev) => [...prev, ...previews]);
    } catch {
      setReplyError("画像の読み込みに失敗しました。");
    }
  }

  function removeReplyImage(index: number) {
    setReplyImageFiles((prev) => prev.filter((_, i) => i !== index));
    setReplyImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDeletePost() {
    if (!post || !user?.id || deletingPost) return;
    const confirmed = window.confirm(
      "この投稿を削除しますか？投稿本文・画像・返信は表示されなくなります。",
    );
    if (!confirmed) return;
    setDeletingPost(true);
    const postImageUrls = resolveImageUrls(post.imageUrls, post.imageUrl);
    const replyImageUrls = replies.flatMap((r) => resolveImageUrls(r.imageUrls, r.imageUrl));
    const allImageUrls = [...postImageUrls, ...replyImageUrls];
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
    if (allImageUrls.length > 0) {
      void removeOwnedPostImages(allImageUrls, user.id).catch((err: unknown) => {
        console.error("Storage cleanup failed (non-blocking):", err);
      });
    }
    await refetchPosts();
    router.push("/posts");
  }

  async function handleDeleteReply(replyId: string) {
    if (!user?.id || deletingReplyId) return;
    const confirmed = window.confirm(
      "この返信を削除しますか？返信本文と画像は表示されなくなります。",
    );
    if (!confirmed) return;
    setDeletingReplyId(replyId);
    const targetReply = replies.find((r) => r.id === replyId);
    const replyImageUrls = resolveImageUrls(
      targetReply?.imageUrls ?? [],
      targetReply?.imageUrl ?? null,
    );
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
    if (replyImageUrls.length > 0) {
      void removeOwnedPostImages(replyImageUrls, user.id).catch((err: unknown) => {
        console.error("Storage cleanup failed (non-blocking):", err);
      });
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

    const uploadedUrls: string[] = [];
    const replyUserId = user?.id;
    if (!replyUserId) { setSubmittingReply(false); return; }
    for (const file of replyImageFiles) {
      // 圧縮
      let blob: Blob;
      let contentType: "image/jpeg" | "image/webp";
      let extension: "jpg" | "webp";
      try {
        const result = await compressImage(file);
        blob = result.blob;
        contentType = result.contentType;
        extension = result.extension;
      } catch (err) {
        console.error("[compress:failed] file:", file.name, file.type, file.size);
        console.error("[compress:failed] err:", err instanceof Error ? err.message : String(err));
        if (err instanceof Error && err.message === "HEIC_NOT_SUPPORTED") {
          setReplyError("この画像形式は処理できない場合があります。iPhoneのカメラ設定を「互換性優先」にするか、JPEG/PNG/WebP画像を選択してください。");
        } else if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
          setReplyError("圧縮後も画像が2MBを超えています。より小さい画像を選んでください。");
        } else {
          setReplyError("画像の処理に失敗しました。別の画像を選択するか、JPEG/PNG/WebP形式の画像をお試しください。");
        }
        setSubmittingReply(false);
        return;
      }
      // アップロード
      const fileName = `replies/${replyUserId}/${createSafeId()}.${extension}`;
      let uploadedPath: string;
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, blob, { contentType, upsert: false });
        if (uploadError || !uploadData) {
          console.error("[upload:failed] message:", uploadError?.message);
          console.error("[upload:failed] detail:", JSON.stringify(uploadError));
          console.error("[upload:failed] path:", fileName, "contentType:", contentType, "blobSize:", blob.size);
          setReplyError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
          setSubmittingReply(false);
          return;
        }
        uploadedPath = uploadData.path;
      } catch (err) {
        console.error("[upload:exception] path:", fileName, "contentType:", contentType, "blobSize:", blob.size);
        console.error("[upload:exception] err:", err instanceof Error ? err.message : String(err));
        setReplyError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
        setSubmittingReply(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(uploadedPath);
      uploadedUrls.push(urlData.publicUrl);
    }

    const { data, error: insertError } = await supabase
      .from("replies")
      .insert({
        post_id: toDbId(String(post.id)),
        description: body,
        image_url: null,
        image_urls: uploadedUrls,
        likes: 0,
        user_id: user?.id ?? null,
      })
      .select("id, post_id, description, image_url, image_urls, likes, created_at, user_id")
      .single();

    if (insertError) {
      console.error("Failed to post reply:", insertError.message);
      setReplyError("返信の投稿に失敗しました。");
      setSubmittingReply(false);
      return;
    }

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
    setReplyImageFiles([]);
    setReplyImagePreviews([]);
    setSubmittingReply(false);
  }

  function handleEditPost() {
    if (!post) return;
    setEditTitle(post.title);
    setEditDescription(post.description);
    setEditTargetUrl(post.targetUrl ?? "");
    setEditCategory(post.category);
    setEditPostError(null);
    setEditPostImageUrls(resolveImageUrls(post.imageUrls, post.imageUrl));
    setNewPostImageFiles([]);
    setNewPostImagePreviews([]);
    setEditingPost(true);
  }

  function handleCancelEditPost() {
    setEditingPost(false);
    setEditPostError(null);
    setEditPostImageUrls([]);
    setNewPostImageFiles([]);
    setNewPostImagePreviews([]);
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

    const uploadedUrls: string[] = [];
    for (const file of newPostImageFiles) {
      // 圧縮
      let blob: Blob;
      let contentType: "image/jpeg" | "image/webp";
      let extension: "jpg" | "webp";
      try {
        const result = await compressImage(file);
        blob = result.blob;
        contentType = result.contentType;
        extension = result.extension;
      } catch (err) {
        console.error("[compress:failed] file:", file.name, file.type, file.size);
        console.error("[compress:failed] err:", err instanceof Error ? err.message : String(err));
        if (err instanceof Error && err.message === "HEIC_NOT_SUPPORTED") {
          setEditPostError("この画像形式は処理できない場合があります。iPhoneのカメラ設定を「互換性優先」にするか、JPEG/PNG/WebP画像を選択してください。");
        } else if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
          setEditPostError("圧縮後も画像が2MBを超えています。より小さい画像を選んでください。");
        } else {
          setEditPostError("画像の処理に失敗しました。別の画像を選択するか、JPEG/PNG/WebP形式の画像をお試しください。");
        }
        setSavingPost(false);
        return;
      }
      // アップロード
      const fileName = `posts/${user.id}/${createSafeId()}.${extension}`;
      let uploadedPath: string;
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, blob, { contentType, upsert: false });
        if (uploadError || !uploadData) {
          console.error("[upload:failed] message:", uploadError?.message);
          console.error("[upload:failed] detail:", JSON.stringify(uploadError));
          console.error("[upload:failed] path:", fileName, "contentType:", contentType, "blobSize:", blob.size);
          setEditPostError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
          setSavingPost(false);
          return;
        }
        uploadedPath = uploadData.path;
      } catch (err) {
        console.error("[upload:exception] path:", fileName, "contentType:", contentType, "blobSize:", blob.size);
        console.error("[upload:exception] err:", err instanceof Error ? err.message : String(err));
        setEditPostError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
        setSavingPost(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(uploadedPath);
      uploadedUrls.push(urlData.publicUrl);
    }

    const finalImageUrls = [...editPostImageUrls, ...uploadedUrls];
    const removedPostImageUrls = resolveImageUrls(post.imageUrls, post.imageUrl).filter(
      (u) => !editPostImageUrls.includes(u),
    );
    const { error: updateError } = await supabase
      .from("posts")
      .update({ title, description, target_url: targetUrl, category: editCategory, image_urls: finalImageUrls, image_url: null })
      .eq("id", toDbId(String(post.id)))
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Failed to update post:", updateError.message);
      setEditPostError("保存に失敗しました。しばらくしてから再度お試しください。");
      setSavingPost(false);
      return;
    }
    setPost((prev) => prev ? { ...prev, title, description, targetUrl, category: editCategory, imageUrls: finalImageUrls, imageUrl: null } : prev);
    await refetchPosts();
    if (removedPostImageUrls.length > 0) {
      void removeOwnedPostImages(removedPostImageUrls, user.id).catch((err: unknown) => {
        console.error("Storage cleanup failed (non-blocking):", err);
      });
    }
    setEditingPost(false);
    setNewPostImageFiles([]);
    setNewPostImagePreviews([]);
    setSavingPost(false);
  }

  function handleEditReply(replyId: string) {
    const reply = replies.find((r) => r.id === replyId);
    if (!reply) return;
    setEditReplyBody(reply.description);
    setEditReplyError(null);
    setEditReplyImageUrls(resolveImageUrls(reply.imageUrls, reply.imageUrl));
    setNewReplyImageFiles([]);
    setNewReplyImagePreviews([]);
    setEditingReplyId(replyId);
  }

  function handleCancelEditReply() {
    setEditingReplyId(null);
    setEditReplyError(null);
    setEditReplyImageUrls([]);
    setNewReplyImageFiles([]);
    setNewReplyImagePreviews([]);
  }

  async function handleSaveReply(replyId: string) {
    if (!user?.id || savingReplyId) return;
    const body = editReplyBody.trim();
    if (!body) { setEditReplyError("返信内容を入力してください"); return; }
    setEditReplyError(null);
    setSavingReplyId(replyId);

    const uploadedUrls: string[] = [];
    for (const file of newReplyImageFiles) {
      // 圧縮
      let blob: Blob;
      let contentType: "image/jpeg" | "image/webp";
      let extension: "jpg" | "webp";
      try {
        const result = await compressImage(file);
        blob = result.blob;
        contentType = result.contentType;
        extension = result.extension;
      } catch (err) {
        console.error("[compress:failed] file:", file.name, file.type, file.size);
        console.error("[compress:failed] err:", err instanceof Error ? err.message : String(err));
        if (err instanceof Error && err.message === "HEIC_NOT_SUPPORTED") {
          setEditReplyError("この画像形式は処理できない場合があります。iPhoneのカメラ設定を「互換性優先」にするか、JPEG/PNG/WebP画像を選択してください。");
        } else if (err instanceof Error && err.message === "IMAGE_TOO_LARGE") {
          setEditReplyError("圧縮後も画像が2MBを超えています。より小さい画像を選んでください。");
        } else {
          setEditReplyError("画像の処理に失敗しました。別の画像を選択するか、JPEG/PNG/WebP形式の画像をお試しください。");
        }
        setSavingReplyId(null);
        return;
      }
      // アップロード
      const fileName = `replies/${user.id}/${createSafeId()}.${extension}`;
      let uploadedPath: string;
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, blob, { contentType, upsert: false });
        if (uploadError || !uploadData) {
          console.error("[upload:failed] message:", uploadError?.message);
          console.error("[upload:failed] detail:", JSON.stringify(uploadError));
          console.error("[upload:failed] path:", fileName, "contentType:", contentType, "blobSize:", blob.size);
          setEditReplyError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
          setSavingReplyId(null);
          return;
        }
        uploadedPath = uploadData.path;
      } catch (err) {
        console.error("[upload:exception] path:", fileName, "contentType:", contentType, "blobSize:", blob.size);
        console.error("[upload:exception] err:", err instanceof Error ? err.message : String(err));
        setEditReplyError("画像のアップロードに失敗しました。時間をおいて再度お試しください。");
        setSavingReplyId(null);
        return;
      }
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(uploadedPath);
      uploadedUrls.push(urlData.publicUrl);
    }

    const finalImageUrls = [...editReplyImageUrls, ...uploadedUrls];
    const targetReply = replies.find((r) => r.id === replyId);
    const removedReplyImageUrls = resolveImageUrls(
      targetReply?.imageUrls ?? [],
      targetReply?.imageUrl ?? null,
    ).filter((u) => !editReplyImageUrls.includes(u));
    const { error: updateError } = await supabase
      .from("replies")
      .update({ description: body, image_urls: finalImageUrls, image_url: null })
      .eq("id", toDbId(replyId))
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Failed to update reply:", updateError.message);
      setEditReplyError("保存に失敗しました。しばらくしてから再度お試しください。");
      setSavingReplyId(null);
      return;
    }
    setReplies((prev) =>
      prev.map((r) =>
        r.id === replyId ? { ...r, description: body, imageUrls: finalImageUrls, imageUrl: null } : r,
      ),
    );
    if (removedReplyImageUrls.length > 0) {
      void removeOwnedPostImages(removedReplyImageUrls, user.id).catch((err: unknown) => {
        console.error("Storage cleanup failed (non-blocking):", err);
      });
    }
    setEditingReplyId(null);
    setNewReplyImageFiles([]);
    setNewReplyImagePreviews([]);
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

  async function handleFollowToggle(targetUserId: string) {
    if (!user?.id || followActionUserId) return;
    setFollowActionUserId(targetUserId);
    const isFollowing = followedUserIds.has(targetUserId);
    if (isFollowing) {
      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);
      if (!error) {
        setFollowedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, following_id: targetUserId });
      if (!error) {
        setFollowedUserIds((prev) => new Set([...prev, targetUserId]));
      }
    }
    setFollowActionUserId(null);
  }

  async function handlePostFollowToggle() {
    if (!user?.id || !post || postFollowLoading) return;
    setPostFollowLoading(true);
    if (isPostFollowing) {
      const { error } = await supabase
        .from("post_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", toDbId(String(post.id)));
      if (!error) setIsPostFollowing(false);
    } else {
      const { error } = await supabase
        .from("post_follows")
        .insert({ user_id: user.id, post_id: toDbId(String(post.id)) });
      if (!error) setIsPostFollowing(true);
    }
    setPostFollowLoading(false);
  }

  function handleRemoveExistingPostImage(index: number) {
    setEditPostImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function onPostImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setEditPostError(null);
    if (files.length === 0) return;

    if (files.some((f) => !f.type.startsWith("image/"))) {
      setEditPostError("画像ファイルを選択してください。");
      return;
    }

    const total = editPostImageUrls.length + newPostImageFiles.length;
    const remaining = MAX_POST_IMAGES - total;
    if (remaining <= 0) {
      setEditPostError(`画像は最大${MAX_POST_IMAGES}枚まで追加できます。`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setEditPostError(`画像は最大${MAX_POST_IMAGES}枚まで追加できます。最初の${remaining}枚のみ追加しました。`);
    }

    try {
      const previews = await Promise.all(toAdd.map(readFileAsDataUrl));
      setNewPostImageFiles((prev) => [...prev, ...toAdd]);
      setNewPostImagePreviews((prev) => [...prev, ...previews]);
    } catch {
      setEditPostError("画像の読み込みに失敗しました。");
    }
  }

  function handleRemoveNewPostImage(index: number) {
    setNewPostImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPostImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveExistingReplyImage(index: number) {
    setEditReplyImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function onReplyImageEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setEditReplyError(null);
    if (files.length === 0) return;

    if (files.some((f) => !f.type.startsWith("image/"))) {
      setEditReplyError("画像ファイルを選択してください。");
      return;
    }

    const total = editReplyImageUrls.length + newReplyImageFiles.length;
    const remaining = MAX_REPLY_IMAGES - total;
    if (remaining <= 0) {
      setEditReplyError(`画像は最大${MAX_REPLY_IMAGES}枚まで追加できます。`);
      return;
    }

    const toAdd = files.slice(0, remaining);
    if (files.length > remaining) {
      setEditReplyError(`画像は最大${MAX_REPLY_IMAGES}枚まで追加できます。最初の${remaining}枚のみ追加しました。`);
    }

    try {
      const previews = await Promise.all(toAdd.map(readFileAsDataUrl));
      setNewReplyImageFiles((prev) => [...prev, ...toAdd]);
      setNewReplyImagePreviews((prev) => [...prev, ...previews]);
    } catch {
      setEditReplyError("画像の読み込みに失敗しました。");
    }
  }

  function handleRemoveNewReplyImage(index: number) {
    setNewReplyImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewReplyImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function openLightbox(urls: string[], url: string) {
    const idx = urls.indexOf(url);
    setLightbox({ urls, index: idx >= 0 ? idx : 0 });
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
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-800">画像</p>
                  <ImageEditor
                    existingUrls={editPostImageUrls}
                    newPreviews={newPostImagePreviews}
                    maxImages={MAX_POST_IMAGES}
                    saving={savingPost}
                    onRemoveExisting={handleRemoveExistingPostImage}
                    onAddFiles={onPostImageFileChange}
                    onRemoveNew={handleRemoveNewPostImage}
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
                          disabled={isSelfLike}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                            isPostLiked && user?.id
                              ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100"
                              : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-500"
                          }`}
                          aria-label={`Like post: ${post.title}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                          <span>{post.likes}</span>
                        </button>
                      );
                    })()}
                  </div>
                  {showLikeLoginHint && !user?.id && (
                    <p className="mt-1.5 text-right text-xs text-zinc-500">
                      Likeするには{" "}
                      <Link href="/signin" className="underline underline-offset-2 hover:text-zinc-700">
                        ログイン
                      </Link>
                      {" "}が必要です
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <AvatarIcon
                      avatarUrl={resolveAvatarUrl(postUserId, userStats)}
                      name={resolveDisplayName(postUserId, userStats)}
                      size={20}
                    />
                    <span>
                      投稿者：
                      {(() => {
                        const href = resolveProfileHref(postUserId, user?.id, userStats);
                        return href ? (
                          <Link href={href} className="underline-offset-2 hover:text-zinc-700 hover:underline">
                            {resolveDisplayName(postUserId, userStats)}
                          </Link>
                        ) : (
                          resolveDisplayName(postUserId, userStats)
                        );
                      })()}
                    </span>
                    {!authLoading && user?.id && postUserId && user.id !== postUserId && (
                      <button
                        type="button"
                        onClick={() => handleFollowToggle(postUserId)}
                        disabled={followActionUserId === postUserId}
                        className={followedUserIds.has(postUserId)
                          ? "rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                          : "rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-white transition hover:bg-zinc-600 disabled:opacity-50"
                        }
                      >
                        {followActionUserId === postUserId ? "…" : followedUserIds.has(postUserId) ? "フォロー中" : "フォローする"}
                      </button>
                    )}
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

            {/* 投稿画像 */}
            {!editingPost && (() => {
              const urls = resolveImageUrls(post.imageUrls, post.imageUrl);
              return urls.length > 0 ? (
                <div className="border-t border-zinc-200 overflow-hidden">
                  <ImageGrid urls={urls} onClickImage={(url) => openLightbox(urls, url)} />
                </div>
              ) : null;
            })()}

            {/* 削除・編集・通報ボタン */}
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
                  <div className="flex items-center gap-3">
                    {!authLoading && user?.id && postUserId && user.id !== postUserId && (
                      <button
                        type="button"
                        onClick={handlePostFollowToggle}
                        disabled={postFollowLoading}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                          isPostFollowing
                            ? "border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:text-red-500"
                            : "border-zinc-800 bg-zinc-800 text-white hover:bg-zinc-600"
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={isPostFollowing ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {postFollowLoading ? "…" : isPostFollowing ? "フォロー中" : "この投稿をフォロー"}
                      </button>
                    )}
                    <ReportButton targetType="post" targetId={String(post.id)} />
                  </div>
                )}
              </div>
            )}
          </article>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Reply to this post
            </h2>
            {authLoading ? (
              <div className="mt-4 h-32 animate-pulse rounded-xl bg-zinc-100" />
            ) : !user ? (
              <div className="mt-4">
                <LoginPrompt
                  message="返信するにはログインが必要です"
                  description="ログインすると、返信へのLikeやベストアンサー通知も受け取れます"
                />
              </div>
            ) : (
            <form onSubmit={handleReplySubmit} className="mt-4 space-y-3">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={4}
                placeholder="返信を書く…"
                className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2"
              />
              {/* 画像追加 */}
              {replyImageFiles.length < MAX_REPLY_IMAGES && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={onReplyFileChange}
                  />
                  + 画像を追加
                  <span className="font-normal text-zinc-400">
                    （残り{MAX_REPLY_IMAGES - replyImageFiles.length}枚）
                  </span>
                </label>
              )}
              {/* プレビューグリッド */}
              {replyImagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {replyImagePreviews.map((preview, i) => (
                    <div
                      key={i}
                      className="relative overflow-hidden rounded-xl border border-zinc-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt=""
                        className="aspect-square w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeReplyImage(i)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white transition hover:bg-black/80"
                        aria-label="画像を削除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
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
            )}
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
                    id={`reply-${reply.id}`}
                    className={[
                      "scroll-mt-20 rounded-2xl border p-4 shadow-sm transition-colors duration-700",
                      reply.isBestAnswer ? "border-amber-200" : "border-zinc-200",
                      highlightReplyId === reply.id ? "bg-sky-50" : "bg-white",
                    ].join(" ")}
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
                          <ImageEditor
                            existingUrls={editReplyImageUrls}
                            newPreviews={newReplyImagePreviews}
                            maxImages={MAX_REPLY_IMAGES}
                            saving={savingReplyId === reply.id}
                            onRemoveExisting={handleRemoveExistingReplyImage}
                            onAddFiles={onReplyImageEditFileChange}
                            onRemoveNew={handleRemoveNewReplyImage}
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
                          {/* 返信画像 */}
                          {(() => {
                            const urls = resolveImageUrls(reply.imageUrls, reply.imageUrl);
                            return urls.length > 0 ? (
                              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200">
                                <ImageGrid urls={urls} onClickImage={(url) => openLightbox(urls, url)} />
                              </div>
                            ) : null;
                          })()}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
                            <div className="flex flex-wrap items-center gap-2">
                              <AvatarIcon
                                avatarUrl={resolveAvatarUrl(reply.userId, userStats)}
                                name={resolveDisplayName(reply.userId, userStats)}
                                size={20}
                              />
                              <span className="text-xs">
                                返信者：
                                {(() => {
                                  const href = resolveProfileHref(reply.userId, user?.id, userStats);
                                  return href ? (
                                    <Link href={href} className="underline-offset-2 hover:text-zinc-700 hover:underline">
                                      {resolveDisplayName(reply.userId, userStats)}
                                    </Link>
                                  ) : (
                                    resolveDisplayName(reply.userId, userStats)
                                  );
                                })()}
                              </span>
                              <AdvisorRankBadge rank={resolveAdvisorRank(reply.userId, userStats)} />
                              {!authLoading && user?.id && reply.userId && user.id !== reply.userId && (
                                <button
                                  type="button"
                                  onClick={() => handleFollowToggle(reply.userId!)}
                                  disabled={followActionUserId === reply.userId}
                                  className={followedUserIds.has(reply.userId!)
                                    ? "rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-500 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                                    : "rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-white transition hover:bg-zinc-600 disabled:opacity-50"
                                  }
                                >
                                  {followActionUserId === reply.userId ? "…" : followedUserIds.has(reply.userId!) ? "フォロー中" : "フォローする"}
                                </button>
                              )}
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
                                  disabled={isSelfLikeReply}
                                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
                                    isReplyLiked && user?.id
                                      ? "border-rose-200 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100"
                                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-500"
                                  }`}
                                  aria-label="Like reply"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                                  <span>{reply.likes}</span>
                                </button>
                              );
                            })()}
                          </div>
                          {likeLoginHintReplyId === reply.id && !user?.id && (
                            <p className="mt-1.5 text-right text-xs text-zinc-500">
                              Likeするには{" "}
                              <Link href="/signin" className="underline underline-offset-2 hover:text-zinc-700">
                                ログイン
                              </Link>
                              {" "}が必要です
                            </p>
                          )}
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

      {lightbox && (
        <ImageLightbox
          urls={lightbox.urls}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox((prev) => prev ? { ...prev, index: i } : null)}
        />
      )}
    </div>
  );
}
