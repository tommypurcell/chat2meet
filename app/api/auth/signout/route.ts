import { NextResponse } from "next/server";
import { FIREBASE_SESSION_COOKIE } from "@/lib/auth-session";

/**
 * POST /api/auth/signout
 * Clears the Firebase session cookie.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(FIREBASE_SESSION_COOKIE);
  return res;
}
