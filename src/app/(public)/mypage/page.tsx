"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { CategoryBadge } from "@/components/CategoryBadge";
import { getAdvisorRank } from "@/lib/advisor-rank";
import { AdvisorRankBadge } from "@/components/AdvisorRankBadge";
import AvatarEditor, { type AvatarEditorRef } from "react-avatar-editor";
import { AvatarIcon } from "@/components/AvatarIcon";
import { compressAvatar } from "@/lib/compress-image";
import type { CategorySlug } from "@/lib/categories";

const MAX_DISPLAY_NAME_LENGTH = 20;
const REPLY_EXCERPT_LEN = 60;
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

function truncate(text: string, len = REPLY_EXCERPT_LEN): string {
  return text.length > len ? text.slice(0, len) + "…" : text;
}

type MyPost = {
  id: number;
  title: string;
  created_at: string;
  category: string;
  likes: number;
  status: string;
};

type MyReply = {
  id: number;
  description: string;
  created_at: string;
  likes: number;
  is_best_answer: boolean;
  status: string;
  post_id: number;
  posts: { id: number; title: string } | null;
};

type MyStats = {
  post_count: number;
  reply_count: number;
  total_reply_likes: number;
  best_answer_count: number;
};

type FollowingUser = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type FollowedPost = {
  post_id: number;
  created_at: string;
  posts: {
    id: number;
    title: string;
    category: string;
    status: string;
  } | null;
};

export default function MyPage() {
  const { user, loading, refreshDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // avatar
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1.2);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditorRef>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropZoomRef = useRef(cropZoom);

  // username
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [myReplies, setMyReplies] = useState<MyReply[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [followingUsers, setFollowingUsers] = useState<FollowingUser[]>([]);
  // 現在の画面でフォロー解除したユーザーのID（行を残しつつ再フォロー可能にする）
  const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set());
  const [followActionId, setFollowActionId] = useState<string | null>(null);
  // 投稿フォロー
  const [followedPosts, setFollowedPosts] = useState<FollowedPost[]>([]);
  const [unfollowedPostIds, setUnfollowedPostIds] = useState<Set<number>>(new Set());
  const [postFollowActionId, setPostFollowActionId] = useState<number | null>(null);
  // プロフィール編集モード
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  // 相手からカウント
  const [followerCount, setFollowerCount] = useState(0);
  const [ownPostLikeSum, setOwnPostLikeSum] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  // フォロワー/フォロー中モーダル
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState<FollowingUser[]>([]);
  const [followListLoading, setFollowListLoading] = useState(false);
  const [modalFollowingIds, setModalFollowingIds] = useState<Set<string>>(new Set());
  const [modalFollowActionId, setModalFollowActionId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setFetching(false);
      return;
    }
    void (async () => {
      const [profileResult, postsResult, repliesResult, statsResult, followerCountResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("posts")
            .select("id, title, created_at, category, likes, status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("replies")
            .select("id, description, created_at, likes, is_best_answer, status, post_id, posts(id, title)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_stats")
            .select("post_count, reply_count, total_reply_likes, best_answer_count")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", user.id),
        ]);

      const profile = profileResult.data as { display_name: string | null; username: string | null; avatar_url: string | null } | null;
      setDisplayName(profile?.display_name ?? "");
      setCurrentUsername(profile?.username ?? null);
      setCurrentAvatarUrl(profile?.avatar_url ?? null);
      const fetchedPosts = (postsResult.data ?? []) as MyPost[];
      setMyPosts(fetchedPosts);
      setMyReplies((repliesResult.data ?? []) as unknown as MyReply[]);
      setMyStats(statsResult.data as MyStats | null);
      setFollowerCount(followerCountResult.count ?? 0);
      setOwnPostLikeSum(
        fetchedPosts
          .filter((p) => p.status !== "hidden")
          .reduce((sum, p) => sum + (p.likes ?? 0), 0),
      );

      // フォロー中ユーザーを取得
      const { data: followingRows } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false });
      const followingIds = (followingRows ?? []).map((r) => r.following_id);
      setFollowingCount(followingIds.length);
      if (followingIds.length > 0) {
        const { data: followingProfilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", followingIds);
        const ordered = followingIds
          .map((id) => (followingProfilesData ?? []).find((p) => p.id === id))
          .filter((p): p is FollowingUser => p != null);
        setFollowingUsers(ordered);
      }

      // フォロー中の投稿を取得
      const { data: followedPostsData } = await supabase
        .from("post_follows")
        .select("post_id, created_at, posts(id, title, category, status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setFollowedPosts((followedPostsData ?? []) as unknown as FollowedPost[]);

      setFetching(false);
    })();
  }, [user, loading]);

  useEffect(() => {
    cropZoomRef.current = cropZoom;
  }, [cropZoom]);

  useEffect(() => {
    const el = cropContainerRef.current;
    if (!el || !cropSrc) return;

    let startDist: number | null = null;
    let startZoom = 1.2;

    function getDist(touches: TouchList): number {
      return Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY,
      );
    }

    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const sensitivity = e.deltaMode === 0 ? 0.005 : 0.05;
      setCropZoom((z) => Math.min(3, Math.max(1, z + -e.deltaY * sensitivity)));
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        startDist = getDist(e.touches);
        startZoom = cropZoomRef.current;
        e.stopPropagation();
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || startDist === null) return;
      e.preventDefault();
      e.stopPropagation();
      setCropZoom(Math.min(3, Math.max(1, startZoom * (getDist(e.touches) / startDist))));
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) startDist = null;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    el.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
    el.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart, { capture: true });
      el.removeEventListener("touchmove", onTouchMove, { capture: true });
      el.removeEventListener("touchend", onTouchEnd, { capture: true });
    };
  }, [cropSrc]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(file));
    setCropZoom(1.2);
    e.target.value = "";
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropZoom(1.2);
  }

  function handleCropConfirm() {
    if (!editorRef.current) return;
    setAvatarError(null);
    const canvas = editorRef.current.getImageScaledToCanvas();
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setAvatarError("画像の処理に失敗しました");
          return;
        }
        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(URL.createObjectURL(blob));
        setPendingAvatarBlob(blob);
        if (cropSrc) URL.revokeObjectURL(cropSrc);
        setCropSrc(null);
        setCropZoom(1.2);
      },
      "image/webp",
      0.92,
    );
  }

  async function handleSaveUsername(e: React.FormEvent) {
    e.preventDefault();
    const normalized = usernameInput.toLowerCase().trim();
    setUsernameError(null);
    setUsernameSuccess(false);

    if (!normalized) {
      setUsernameError("ユーザー名を入力してください");
      return;
    }
    if (!USERNAME_REGEX.test(normalized)) {
      setUsernameError("3〜20文字・英小文字/数字/アンダースコアのみ使用できます");
      return;
    }
    if (!user) return;

    setSavingUsername(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalized)
      .maybeSingle();

    if (existing) {
      setUsernameError("このユーザー名はすでに使用されています");
      setSavingUsername(false);
      return;
    }

    const updatePayload: Record<string, string> = {
      id: user.id,
      username: normalized,
      updated_at: new Date().toISOString(),
    };
    // display_name が未設定なら username で初期化
    if (!displayName.trim()) {
      updatePayload.display_name = normalized;
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(updatePayload, { onConflict: "id" });

    if (upsertError) {
      if (upsertError.message.includes("profiles_username_unique") || upsertError.message.includes("duplicate")) {
        setUsernameError("このユーザー名はすでに使用されています");
      } else {
        setUsernameError("保存に失敗しました。しばらくしてから再度お試しください。");
      }
      setSavingUsername(false);
      return;
    }

    setCurrentUsername(normalized);
    if (!displayName.trim()) {
      setDisplayName(normalized);
      await refreshDisplayName();
    }
    setUsernameInput("");
    setUsernameSuccess(true);
    setSavingUsername(false);
  }

  async function handleSave() {
    const trimmed = displayName.trim();
    setError(null);
    setSuccess(false);
    setAvatarError(null);

    if (!trimmed) {
      setError("名前を入力してください");
      return;
    }
    if (!user) return;

    setSaving(true);

    let newAvatarUrl: string | null = null;
    if (pendingAvatarBlob) {
      let uploadBlob: Blob;
      try {
        uploadBlob = await compressAvatar(pendingAvatarBlob);
      } catch {
        setError("画像を2MB以内に圧縮できませんでした。別の画像を選択してください。");
        setSaving(false);
        return;
      }

      const path = `${user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, uploadBlob, { upsert: true, contentType: uploadBlob.type || "image/webp" });

      if (uploadError) {
        setError("画像のアップロードに失敗しました。しばらくしてから再度お試しください。");
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    }

    const payload: Record<string, string> = {
      id: user.id,
      display_name: trimmed,
      updated_at: new Date().toISOString(),
    };
    if (newAvatarUrl) payload.avatar_url = newAvatarUrl;

    const { error: upsertError } = await supabase.from("profiles").upsert(payload);

    if (upsertError) {
      setError("保存に失敗しました。しばらくしてから再度お試しください。");
      setSaving(false);
      return;
    }

    setDisplayName(trimmed);
    if (newAvatarUrl) {
      setCurrentAvatarUrl(newAvatarUrl);
      setPendingAvatarBlob(null);
    }
    await refreshDisplayName();
    setSuccess(true);
    setSaving(false);
  }

  function handleCancelEditProfile() {
    if (cropSrc) {
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      setCropZoom(1.2);
    }
    setIsEditingProfile(false);
    setError(null);
    setSuccess(false);
    setAvatarError(null);
  }

  async function handleOpenFollowers() {
    if (!user) return;
    setShowFollowersModal(true);
    setFollowListLoading(true);
    const { data: rows } = await supabase
      .from("user_follows")
      .select("follower_id")
      .eq("following_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = (rows ?? []).map((r) => r.follower_id);
    if (ids.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", ids);
      setFollowersList((profilesData ?? []) as FollowingUser[]);
    } else {
      setFollowersList([]);
    }
    setModalFollowingIds(new Set(followingUsers.map((u) => u.id)));
    setFollowListLoading(false);
  }

  function handleOpenFollowing() {
    setModalFollowingIds(new Set(followingUsers.map((u) => u.id)));
    setShowFollowingModal(true);
  }

  async function handleModalFollowToggle(targetId: string) {
    if (!user) return;
    setModalFollowActionId(targetId);
    const isCurrentlyFollowing = modalFollowingIds.has(targetId);
    if (isCurrentlyFollowing) {
      const { error } = await supabase.from("user_follows").delete()
        .eq("follower_id", user.id).eq("following_id", targetId);
      if (!error) {
        setModalFollowingIds((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
        setFollowingCount((n) => Math.max(0, n - 1));
      }
    } else {
      const { error } = await supabase.from("user_follows").insert({ follower_id: user.id, following_id: targetId });
      if (!error) {
        setModalFollowingIds((prev) => new Set([...prev, targetId]));
        setFollowingCount((n) => n + 1);
      }
    }
    setModalFollowActionId(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-8 py-16 text-center">
          <p className="text-sm text-zinc-600">
            マイページを利用するにはサインインが必要です。
          </p>
          <Link
            href="/signin"
            className="mt-4 inline-block rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            サインインへ
          </Link>
        </div>
      </div>
    );
  }

  const rank = myStats ? getAdvisorRank(myStats) : null;

  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="space-y-6">

        {/* ① プロフィールセクション */}
        <div>
          <h2 className="mb-4 text-base font-semibold text-zinc-900">プロフィール</h2>
          {fetching ? (
            <div className="h-24 animate-pulse rounded-xl bg-zinc-100" />
          ) : isEditingProfile ? (
            /* 編集モード */
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-700">プロフィールを編集</p>
                <button type="button" onClick={handleCancelEditProfile} className="text-sm text-zinc-400 transition hover:text-zinc-700">✕</button>
              </div>
              {/* アバター */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-800">プロフィール画像</p>
                {cropSrc ? (
                  <div ref={cropContainerRef} className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-center text-xs text-zinc-500">ドラッグで位置調整・スライダーでズーム</p>
                    <div className="flex justify-center">
                      <AvatarEditor ref={editorRef} image={cropSrc} width={260} height={260} border={30} borderRadius={130} color={[244, 244, 245, 0.75]} scale={cropZoom} />
                    </div>
                    <div className="space-y-1 px-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400"><span>縮小</span><span>拡大</span></div>
                      <input type="range" min={1} max={3} step={0.01} value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} className="w-full accent-zinc-900" />
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={handleCropCancel} className="flex-1 rounded-full border border-zinc-200 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-white">キャンセル</button>
                      <button type="button" onClick={handleCropConfirm} className="flex-1 rounded-full bg-zinc-900 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800">決定</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <AvatarIcon avatarUrl={avatarPreviewUrl ?? currentAvatarUrl} name={displayName || "?"} size={64} />
                    <div>
                      <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                      <button type="button" onClick={() => avatarInputRef.current?.click()} className="rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50">画像を変更</button>
                    </div>
                  </div>
                )}
                {avatarError && <p className="text-xs text-red-600" role="alert">{avatarError}</p>}
              </div>
              {/* 名前 */}
              <div className="space-y-2">
                <label htmlFor="displayName" className="text-sm font-medium text-zinc-800">名前</label>
                <input id="displayName" type="text" value={displayName} onChange={(e) => { setDisplayName(e.target.value); setError(null); setSuccess(false); }} maxLength={MAX_DISPLAY_NAME_LENGTH} placeholder="例：山田太郎" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-300 focus:ring-2" />
                <p className="text-xs text-zinc-400">{displayName.length}/{MAX_DISPLAY_NAME_LENGTH}文字</p>
              </div>
              {/* ユーザー名 */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-800">ユーザー名</p>
                {currentUsername ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] text-zinc-900">{currentUsername}</span>
                    <span className="text-xs text-zinc-400">（変更は現在非対応）</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveUsername} className="space-y-2">
                    <input type="text" value={usernameInput} onChange={(e) => { setUsernameInput(e.target.value.toLowerCase().trim()); setUsernameError(null); setUsernameSuccess(false); }} placeholder="例：taro_yamada" autoComplete="username" className={`w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:ring-2 ${usernameError ? "border-red-300 focus:border-red-400" : "border-zinc-200 focus:border-zinc-300"}`} />
                    {usernameError ? <p className="text-xs text-red-600" role="alert">{usernameError}</p> : usernameSuccess ? <p className="text-xs text-emerald-600" role="status">ユーザー名を設定しました</p> : <p className="text-xs text-zinc-400">3〜20文字・英小文字 / 数字 / アンダースコアのみ</p>}
                    <button type="submit" disabled={savingUsername} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">{savingUsername ? "設定中…" : "設定する"}</button>
                  </form>
                )}
              </div>
              {/* メール */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-800">メールアドレス</p>
                <p className="text-[15px] text-zinc-900">{user.email}</p>
              </div>
              {/* パスワード */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-800">パスワード</p>
                <p className="text-[15px] tracking-widest text-zinc-900">••••••••</p>
                <p className="text-xs text-zinc-400">変更機能は今後対応予定</p>
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              {success && <p className="text-sm text-emerald-600" role="status">保存しました</p>}
              <button type="button" onClick={handleSave} disabled={saving} className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70">
                {saving ? "保存中…" : "保存する"}
              </button>
            </div>
          ) : (
            /* 表示モード */
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AvatarIcon avatarUrl={currentAvatarUrl} name={displayName || "?"} size={72} />
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{displayName || "—"}</h1>
                    {currentUsername && <p className="mt-0.5 text-sm text-zinc-500">@{currentUsername}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdvisorRankBadge rank={rank} showNone />
                  <button type="button" onClick={() => setIsEditingProfile(true)} className="rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:bg-zinc-50">
                    プロフィールを編集する
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-6">
                <button type="button" onClick={handleOpenFollowers} className="group text-left">
                  <span className="text-base font-semibold text-zinc-900">{followerCount}</span>
                  <span className="ml-1.5 text-sm text-zinc-500 group-hover:text-zinc-700">フォロワー</span>
                </button>
                <button type="button" onClick={handleOpenFollowing} className="group text-left">
                  <span className="text-base font-semibold text-zinc-900">{followingCount}</span>
                  <span className="ml-1.5 text-sm text-zinc-500 group-hover:text-zinc-700">フォロー中</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ② 自分から */}
        <div>
          <h2 className="text-base font-semibold text-zinc-900">自分から</h2>
          {fetching ? (
            <div className="mt-4 h-16 animate-pulse rounded-xl bg-zinc-100" />
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(
                [
                  { label: "返信", value: myStats?.reply_count ?? 0, href: "/mypage/replies" },
                  { label: "投稿フォロー", value: followedPosts.length },
                  { label: "いいね", value: null },
                  { label: "おなじ気持ち", value: null },
                  { label: "ベストアンサー", value: null },
                ] as Array<{ label: string; value: number | null; href?: string }>
              ).map(({ label, value, href }) => {
                const cardClass = "rounded-xl border border-zinc-100 bg-zinc-50 px-2 py-3 text-center";
                const inner = (
                  <>
                    <p className="text-xl font-semibold text-zinc-900">{value !== null ? value : "—"}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
                  </>
                );
                return href ? (
                  <Link key={label} href={href} className={`${cardClass} block transition hover:bg-zinc-100`}>{inner}</Link>
                ) : (
                  <div key={label} className={cardClass}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>

        {/* ③ 相手から */}
        <div>
          <h2 className="text-base font-semibold text-zinc-900">相手から</h2>
          {fetching ? (
            <div className="mt-4 h-16 animate-pulse rounded-xl bg-zinc-100" />
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(
                [
                  { label: "返信", value: null },
                  { label: "投稿フォロー", value: null },
                  { label: "いいね", value: myStats?.total_reply_likes ?? 0 },
                  { label: "おなじ気持ち", value: ownPostLikeSum },
                  { label: "ベストアンサー", value: myStats?.best_answer_count ?? 0 },
                ] as Array<{ label: string; value: number | null; href?: string }>
              ).map(({ label, value, href }) => {
                const cardClass = "rounded-xl border border-zinc-100 bg-zinc-50 px-2 py-3 text-center";
                const inner = (
                  <>
                    <p className="text-xl font-semibold text-zinc-900">{value !== null ? value : "—"}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-zinc-500">{label}</p>
                  </>
                );
                return href ? (
                  <Link key={label} href={href} className={`${cardClass} block transition hover:bg-zinc-100`}>{inner}</Link>
                ) : (
                  <div key={label} className={cardClass}>{inner}</div>
                );
              })}
            </div>
          )}
          <div className="mt-4">
            <Link href="/advisor-ranks" className="text-xs text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline">アドバイザーランクについて</Link>
          </div>
        </div>

        {/* ④ 最近の投稿 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">最近の投稿</h2>
          {fetching ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-zinc-100" />
          ) : myPosts.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">まだ投稿はありません</p>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-zinc-100">
                {myPosts.slice(0, 5).map((post) => {
                  const isHidden = post.status === "hidden";
                  return (
                    <li key={post.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {isHidden ? (
                          <span className="text-sm font-medium text-zinc-400 line-through">{post.title}</span>
                        ) : (
                          <Link href={`/posts/${post.id}`} className="text-sm font-medium text-zinc-900 underline-offset-2 transition hover:text-zinc-600 hover:underline">{post.title}</Link>
                        )}
                        {isHidden && <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">非表示</span>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <CategoryBadge category={post.category as CategorySlug} />
                        <time dateTime={post.created_at}>{formatDateTime(post.created_at)}</time>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {myPosts.length > 5 && (
                <p className="mt-3 text-xs text-zinc-400">投稿一覧は後続Phaseで対応予定です</p>
              )}
            </>
          )}
        </div>

        {/* ⑤ 最近の返信 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">最近の返信</h2>
          {fetching ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl bg-zinc-100" />
          ) : myReplies.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">まだ返信はありません</p>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-zinc-100">
                {myReplies.slice(0, 5).map((reply) => {
                  const isHidden = reply.status === "hidden";
                  const postTitle = reply.posts?.title ?? "（投稿が見つかりません）";
                  return (
                    <li key={reply.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {reply.is_best_answer && <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">ベストアンサー</span>}
                        {isHidden && <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">非表示</span>}
                      </div>
                      <p className={`mt-1 text-sm ${isHidden ? "text-zinc-400 line-through" : "text-zinc-700"}`}>{truncate(reply.description)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span>返信先：<Link href={`/posts/${reply.post_id}`} className="underline-offset-2 transition hover:text-zinc-600 hover:underline">{postTitle}</Link></span>
                        <time dateTime={reply.created_at}>{formatDateTime(reply.created_at)}</time>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {myReplies.length > 5 && (
                <p className="mt-3 text-xs text-zinc-400">返信一覧は後続Phaseで対応予定です</p>
              )}
            </>
          )}
        </div>

        {/* ⑥ フォロー管理 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">フォロー管理</h2>

          {/* フォロー中のユーザー */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-700">フォロー中のユーザー</h3>
            {fetching ? (
              <div className="mt-3 h-16 animate-pulse rounded-xl bg-zinc-100" />
            ) : followingUsers.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">フォロー中のユーザーはいません</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {followingUsers.map((fu) => {
                  const isUnfollowed = unfollowedIds.has(fu.id);
                  const isLoading = followActionId === fu.id;
                  return (
                    <li key={fu.id} className="flex items-center justify-between gap-3 py-3">
                      <Link href={fu.username ? `/users/${fu.username}` : "#"} className="flex min-w-0 items-center gap-3 transition hover:opacity-80">
                        <AvatarIcon avatarUrl={fu.avatar_url} name={fu.display_name ?? fu.username ?? "?"} size={36} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900">{fu.display_name ?? fu.username ?? "—"}</p>
                          {fu.username && <p className="text-xs text-zinc-500">@{fu.username}</p>}
                        </div>
                      </Link>
                      {isUnfollowed ? (
                        <button type="button" disabled={isLoading} onClick={async () => { if (!user) return; setFollowActionId(fu.id); const { error } = await supabase.from("user_follows").insert({ follower_id: user.id, following_id: fu.id }); if (!error) { setUnfollowedIds((prev) => { const next = new Set(prev); next.delete(fu.id); return next; }); } setFollowActionId(null); }} className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50">
                          {isLoading ? "処理中…" : "フォローする"}
                        </button>
                      ) : (
                        <button type="button" disabled={isLoading} onClick={async () => { if (!user) return; setFollowActionId(fu.id); const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", fu.id); if (!error) { setUnfollowedIds((prev) => new Set([...prev, fu.id])); } setFollowActionId(null); }} className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          {isLoading ? "処理中…" : "フォロー解除"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* フォロー中の投稿 */}
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <h3 className="text-sm font-medium text-zinc-700">フォロー中の投稿</h3>
            {fetching ? (
              <div className="mt-3 h-16 animate-pulse rounded-xl bg-zinc-100" />
            ) : followedPosts.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">フォロー中の投稿はありません</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {followedPosts.map((fp) => {
                  const postData = fp.posts;
                  const isUnfollowed = unfollowedPostIds.has(fp.post_id);
                  const isLoading = postFollowActionId === fp.post_id;
                  const isHidden = postData?.status === "hidden";
                  return (
                    <li key={fp.post_id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isHidden ? (
                            <span className="text-sm font-medium text-zinc-400 line-through">{postData?.title ?? "（投稿が見つかりません）"}</span>
                          ) : (
                            <Link href={`/posts/${fp.post_id}`} className="text-sm font-medium text-zinc-900 underline-offset-2 transition hover:text-zinc-600 hover:underline">{postData?.title ?? "（投稿が見つかりません）"}</Link>
                          )}
                          {isHidden && <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">非表示</span>}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          {postData?.category && <CategoryBadge category={postData.category as CategorySlug} />}
                          <time dateTime={fp.created_at}>{formatDateTime(fp.created_at)}</time>
                        </div>
                      </div>
                      {isUnfollowed ? (
                        <button type="button" disabled={isLoading} onClick={async () => { if (!user) return; setPostFollowActionId(fp.post_id); const { error } = await supabase.from("post_follows").insert({ user_id: user.id, post_id: fp.post_id }); if (!error) { setUnfollowedPostIds((prev) => { const next = new Set(prev); next.delete(fp.post_id); return next; }); } setPostFollowActionId(null); }} className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50">
                          {isLoading ? "処理中…" : "フォローする"}
                        </button>
                      ) : (
                        <button type="button" disabled={isLoading} onClick={async () => { if (!user) return; setPostFollowActionId(fp.post_id); const { error } = await supabase.from("post_follows").delete().eq("user_id", user.id).eq("post_id", fp.post_id); if (!error) { setUnfollowedPostIds((prev) => new Set([...prev, fp.post_id])); } setPostFollowActionId(null); }} className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          {isLoading ? "処理中…" : "フォロー解除"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>

    {/* フォロワーモーダル */}
    {showFollowersModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => { setShowFollowersModal(false); setFollowersList([]); }}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">フォロワー</h2>
            <div className="flex items-center gap-3">
              <Link href="/mypage/followers" onClick={() => setShowFollowersModal(false)} className="text-xs text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline">一覧を見る</Link>
              <button type="button" onClick={() => { setShowFollowersModal(false); setFollowersList([]); }} className="text-sm text-zinc-400 transition hover:text-zinc-700">✕</button>
            </div>
          </div>
          <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
            {followListLoading ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">読み込み中…</li>
            ) : followersList.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">フォロワーはいません</li>
            ) : followersList.map((u) => {
              const isSelf = u.id === user?.id;
              const isFollowingUser = modalFollowingIds.has(u.id);
              const isModalLoading = modalFollowActionId === u.id;
              return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Link
                    href={u.username ? `/users/${u.username}` : "#"}
                    onClick={() => { setShowFollowersModal(false); setFollowersList([]); }}
                    className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
                  >
                    <AvatarIcon avatarUrl={u.avatar_url} name={u.display_name ?? u.username ?? "?"} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{u.display_name ?? u.username ?? "—"}</p>
                      {u.username && <p className="text-xs text-zinc-500">@{u.username}</p>}
                    </div>
                  </Link>
                  {!isSelf && (
                    isFollowingUser ? (
                      <button type="button" disabled={isModalLoading} onClick={() => handleModalFollowToggle(u.id)} className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                        {isModalLoading ? "処理中…" : "フォロー解除"}
                      </button>
                    ) : (
                      <button type="button" disabled={isModalLoading} onClick={() => handleModalFollowToggle(u.id)} className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50">
                        {isModalLoading ? "処理中…" : "フォローする"}
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    )}

    {/* フォロー中モーダル */}
    {showFollowingModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => { setShowFollowingModal(false); }}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-900">フォロー中</h2>
            <div className="flex items-center gap-3">
              <Link href="/mypage/following" onClick={() => setShowFollowingModal(false)} className="text-xs text-zinc-500 underline-offset-2 transition hover:text-zinc-700 hover:underline">一覧を見る</Link>
              <button type="button" onClick={() => { setShowFollowingModal(false); }} className="text-sm text-zinc-400 transition hover:text-zinc-700">✕</button>
            </div>
          </div>
          <ul className="max-h-96 divide-y divide-zinc-100 overflow-y-auto">
            {followingUsers.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-zinc-400">フォロー中のユーザーはいません</li>
            ) : followingUsers.map((u) => {
              const isSelf = u.id === user?.id;
              const isFollowingUser = modalFollowingIds.has(u.id);
              const isModalLoading = modalFollowActionId === u.id;
              return (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Link
                    href={u.username ? `/users/${u.username}` : "#"}
                    onClick={() => setShowFollowingModal(false)}
                    className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
                  >
                    <AvatarIcon avatarUrl={u.avatar_url} name={u.display_name ?? u.username ?? "?"} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">{u.display_name ?? u.username ?? "—"}</p>
                      {u.username && <p className="text-xs text-zinc-500">@{u.username}</p>}
                    </div>
                  </Link>
                  {!isSelf && (
                    isFollowingUser ? (
                      <button type="button" disabled={isModalLoading} onClick={() => handleModalFollowToggle(u.id)} className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                        {isModalLoading ? "処理中…" : "フォロー解除"}
                      </button>
                    ) : (
                      <button type="button" disabled={isModalLoading} onClick={() => handleModalFollowToggle(u.id)} className="shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50">
                        {isModalLoading ? "処理中…" : "フォローする"}
                      </button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    )}
    </>
  );
}
