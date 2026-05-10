import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

const VALID_TARGET_TYPES = new Set(["post", "reply"]);
const VALID_REASONS = new Set([
  "spam",
  "inappropriate",
  "harassment",
  "false_info",
  "other",
]);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { target_type, target_id, reason, description, client_token } =
    body as {
      target_type?: string;
      target_id?: unknown;
      reason?: string;
      description?: string | null;
      client_token?: string;
    };

  if (!target_type || !VALID_TARGET_TYPES.has(target_type)) {
    return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
  }
  if (
    typeof target_id !== "number" ||
    !Number.isInteger(target_id) ||
    target_id <= 0
  ) {
    return NextResponse.json({ error: "Invalid target_id" }, { status: 400 });
  }
  if (!reason || !VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  if (
    !client_token ||
    typeof client_token !== "string" ||
    client_token.length < 16
  ) {
    return NextResponse.json(
      { error: "Invalid client_token" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("reports").insert({
    target_type,
    target_id,
    reason,
    description: description ?? null,
    client_token,
  });

  if (error) {
    console.error("Failed to insert report:", error.message);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { target_type, target_id, token } = body as {
    target_type?: string;
    target_id?: unknown;
    token?: string;
  };

  if (!target_type || !VALID_TARGET_TYPES.has(target_type)) {
    return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
  }
  if (
    typeof target_id !== "number" ||
    !Number.isInteger(target_id) ||
    target_id <= 0
  ) {
    return NextResponse.json({ error: "Invalid target_id" }, { status: 400 });
  }
  if (!token || typeof token !== "string" || token.length < 16) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("cancel_report_by_token", {
    p_target_type: target_type,
    p_target_id: target_id,
    p_token: token,
  });

  if (error) {
    console.error("Failed to cancel report:", error.message);
    return NextResponse.json(
      { error: "Failed to cancel report" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Report not found or token mismatch" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
