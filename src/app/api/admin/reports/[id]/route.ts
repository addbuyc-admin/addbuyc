import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminUserId } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_STATUSES = new Set(["open", "resolved", "dismissed"]);

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

  const { status, admin_note } = body as {
    status?: string;
    admin_note?: string | null;
  };

  if (status === undefined && admin_note === undefined) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (status !== undefined) {
    updates.status = status;
    updates.handled_at =
      status === "open" ? null : new Date().toISOString();
  }
  if (admin_note !== undefined) {
    updates.admin_note = admin_note ?? null;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reports")
    .update(updates)
    .eq("id", dbId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true });
}
