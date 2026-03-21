import { NextResponse } from "next/server";
import {
  FIREBASE_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(FIREBASE_SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
