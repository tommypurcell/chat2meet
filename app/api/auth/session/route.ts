import { NextRequest, NextResponse } from "next/server";
import { getAuth, getDb, getServerTimestamp } from "@/lib/firebase-admin";
import { timestamps } from "@/lib/api-helpers";
import {
  FIREBASE_SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth-session";

const SESSION_EXPIRES_MS = 60 * 60 * 24 * 5 * 1000; // 5 days (Firebase session cookie limit)

/**
 * POST /api/auth/session
 * Body: { idToken: string } — Firebase Auth ID token after Google sign-in on the client.
 * Creates a Firebase session cookie and syncs `users/{uid}` in Firestore.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const idToken = typeof body.idToken === "string" ? body.idToken : null;
    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_MS,
    });

    const uid = decoded.uid;
    const email = decoded.email ?? "";
    const name =
      (decoded.name as string | undefined) ||
      (email ? email.split("@")[0] : "User");
    const photoUrl = (decoded.picture as string | undefined) ?? "";

    const db = getDb();
    const userRef = db.collection("users").doc(uid);
    const existing = await userRef.get();
    const ts = timestamps();

    if (!existing.exists) {
      await userRef.set({
        name,
        email,
        photoUrl,
        timezone: "America/Los_Angeles",
        calendarConnected: false,
        ghostMode: false,
        createdAt: ts.createdAt,
        updatedAt: ts.updatedAt,
      });
    } else {
      await userRef.update({
        name,
        email,
        photoUrl,
        updatedAt: getServerTimestamp(),
      });
    }

    const res = NextResponse.json({ ok: true, uid, isNew: !existing.exists });
    res.cookies.set(FIREBASE_SESSION_COOKIE, sessionCookie, sessionCookieOptions());
    return res;
  } catch (error) {
    console.error("POST /api/auth/session:", error);
    const message = error instanceof Error ? error.message : "Session creation failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
