import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin-session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/dashboard/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
