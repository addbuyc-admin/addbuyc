import { NextResponse } from "next/server";

// このエンドポイントは廃止済みです。
// admin 認証は Supabase auth + profiles.role に移行しました。
// cleanup 時にこのファイルごと削除してください。
export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is no longer available." },
    { status: 405 },
  );
}
