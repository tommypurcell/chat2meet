import { NextRequest, NextResponse } from "next/server";
import { getAuth, getDb } from "@/lib/firebase-admin";
import { FIREBASE_SESSION_COOKIE } from "@/lib/auth-session";

/**
 * POST /api/user/availability
 * Save user availability slots
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(FIREBASE_SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = getAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie);
    const uid = decoded.uid;

    const { slots } = await request.json();
    if (!Array.isArray(slots)) {
      return NextResponse.json({ error: "slots should be an array" }, { status: 400 });
    }

    const db = getDb();
    await db.collection("users").doc(uid).update({
      availableSlots: slots,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/user/availability:", error);
    return NextResponse.json({ error: "Failed to save availability" }, { status: 500 });
  }
}

/**
 * GET /api/user/availability
 * Fetch user availability slots
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(FIREBASE_SESSION_COOKIE)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const auth = getAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie);
    const uid = decoded.uid;

    const db = getDb();
    const userDoc = await db.collection("users").doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = userDoc.data();
    return NextResponse.json({ success: true, slots: data?.availableSlots || [] });
  } catch (error) {
    console.error("GET /api/user/availability:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
  }
}
