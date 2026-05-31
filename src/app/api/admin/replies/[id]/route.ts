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

  const { status } = body as { status?: string };
  if (status !== "published" && status !== "hidden") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("replies")
    .update({ status })
    .eq("id", dbId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
