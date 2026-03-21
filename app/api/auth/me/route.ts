import { NextResponse } from "next/server";
import { collection, getDocOrError } from "@/lib/api-helpers";
import { getSessionUserId } from "@/lib/auth-session";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ user: null });
  }

  const result = await getDocOrError(collection("users").doc(userId));
  if ("error" in result) {
    return NextResponse.json({ user: null });
  }

  const data = result.data as {
    id: string;
    name?: string;
    email?: string;
    photoUrl?: string;
    timezone?: string;
    ghostMode?: boolean;
    calendarConnected?: boolean;
  };

  return NextResponse.json({
    user: {
      uid: data.id,
      email: data.email ?? null,
      displayName: data.name ?? null,
      photoURL: data.photoUrl ?? null,
      timezone: data.timezone ?? "America/Los_Angeles",
      ghostMode: data.ghostMode ?? false,
      calendarConnected: data.calendarConnected ?? false,
    },
  });
}
