import { supabase } from "@/lib/supabase/client";

// Public URL から bucket 内 path を抽出する
// 例: "https://xxx.supabase.co/storage/v1/object/public/post-images/posts/uid/uuid.webp"
//     → "posts/uid/uuid.webp"
function extractStoragePath(publicUrl: string, bucket: string): string | null {
  try {
    const url = new URL(publicUrl);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(url.pathname.slice(prefix.length));
  } catch {
    return null;
  }
}

// 新 path 形式（posts/{userId}/... または replies/{userId}/...）かつ
// 指定 userId の所有ファイルか判定する
// 旧 path（posts/{uuid}.webp）は parts.length !== 3 のため false になる
function isOwnedPostImagePath(path: string, userId: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 3) return false;
  if (parts[0] !== "posts" && parts[0] !== "replies") return false;
  return parts[1] === userId;
}

// urls のうち、新 path かつ userId 配下のものだけ Storage から削除する（best-effort）
// 旧 path・他人のファイル・不正 URL はスキップする
export async function removeOwnedPostImages(urls: string[], userId: string): Promise<void> {
  const paths: string[] = [];
  for (const url of urls) {
    const path = extractStoragePath(url, "post-images");
    if (path && isOwnedPostImagePath(path, userId)) {
      paths.push(path);
    }
  }
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("post-images").remove(paths);
  if (error) {
    console.error("Storage cleanup failed:", error.message);
  }
}
