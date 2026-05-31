import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUserId } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const dbId = /^\d+$/.test(id) ? Number(id) : id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { set, post_id } = body as { set?: unknown; post_id?: unknown };
  if (typeof set !== "boolean" || typeof post_id !== "number") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  if (set) {
    const { error: clearError } = await supabase
      .from("replies")
      .update({ is_best_answer: false })
      .eq("post_id", post_id)
      .eq("is_best_answer", true);

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }
  }

  const { error } = await supabase
    .from("replies")
    .update({ is_best_answer: set })
    .eq("id", dbId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
