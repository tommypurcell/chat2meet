import { cookies } from "next/headers";
import { getAuth } from "@/lib/firebase-admin";

/** HTTP-only cookie holding the Firebase session JWT (from Admin `createSessionCookie`). */
export const FIREBASE_SESSION_COOKIE = "firebase_session";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 5; // match `expiresIn` in /api/auth/session

export async function getSessionUserId(): Promise<string | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(FIREBASE_SESSION_COOKIE)?.value;
    if (!raw) return null;
    const decoded = await getAuth().verifySessionCookie(raw, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
