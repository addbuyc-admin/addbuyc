import { redirect } from "next/navigation";

// 旧パスワードログイン画面は廃止済み。
// /dashboard へのアクセスは middleware で Supabase auth + profiles.role により制御されます。
// ログインが必要な場合は /signin へ誘導します。
export default function DashboardLoginPage() {
  redirect("/signin");
}
