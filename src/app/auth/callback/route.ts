import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const user = data.session.user;
      const username = user.user_metadata?.username as string | undefined;
      const metaDisplayName = user.user_metadata?.display_name as string | undefined;

      // email confirm ON 時に user_metadata から profiles を upsert
      if (username || metaDisplayName) {
        const existingProfile = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", user.id)
          .maybeSingle();

        const currentDisplayName = (existingProfile.data as { display_name: string | null } | null)?.display_name;
        const currentUsername = (existingProfile.data as { username: string | null } | null)?.username;

        const upsertPayload: Record<string, string> = {
          id: user.id,
          updated_at: new Date().toISOString(),
        };
        if (username && !currentUsername) upsertPayload.username = username;
        if (metaDisplayName && !currentDisplayName) upsertPayload.display_name = metaDisplayName;

        if (Object.keys(upsertPayload).length > 2) {
          await supabase.from("profiles").upsert(upsertPayload, { onConflict: "id" });
        }
      }

      return NextResponse.redirect(new URL("/", origin));
    }
  }

  // 認証コードがない or 交換失敗の場合はサインインへ
  return NextResponse.redirect(new URL("/signin", origin));
}
