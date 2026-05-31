import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Supabase session refresh（全ルート対象）
  let supabaseResponse = NextResponse.next({ request });

  const supabaseClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // トークンリフレッシュ（createServerClient と getUser の間にロジックを挟まない）
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  const { pathname } = request.nextUrl;

  // /dashboard へのアクセスは Supabase Auth + profiles.role = 'admin' で制御
  if (pathname.startsWith("/dashboard")) {
    // 未ログイン → /signin へ
    if (!user) {
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    // profiles.role を確認
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    // admin でない → / へ
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
