import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * リクエスト Cookie からログイン中ユーザーを取得し、
 * profiles.role = 'admin' であれば user.id を返す。
 * 未ログイン / 非 admin の場合は null を返す。
 */
export async function getAdminUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return null;
  return user.id;
}
