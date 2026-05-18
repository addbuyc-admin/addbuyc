import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/admin-session";

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
  await supabaseClient.auth.getUser();

  // /dashboard 管理者 Cookie 認証（既存ロジック維持）
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && pathname !== "/dashboard/login") {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret || !token || !(await verifySessionToken(token, secret))) {
      return NextResponse.redirect(new URL("/dashboard/login", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
