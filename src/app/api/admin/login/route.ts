import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/admin-session";

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!adminPassword && !secret) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSWORD and ADMIN_SESSION_SECRET are not set" },
      { status: 500 },
    );
  }
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_PASSWORD is not set" },
      { status: 500 },
    );
  }
  if (!secret) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_SESSION_SECRET is not set" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { password } = body as { password?: string };

  if (!password || password !== adminPassword) {
    return NextResponse.json({ error: "パスワードが違います。" }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return response;
}
