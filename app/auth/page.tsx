"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Connecting calendar...");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus(`Error: ${error}`);
      return;
    }

    if (!code) {
      setStatus("No authorization code received");
      return;
    }

    // Get userId from session storage (set before redirecting to Google)
    const userId = sessionStorage.getItem("connectingUserId");
    if (!userId) {
      setStatus("No user ID found. Please try connecting again.");
      return;
    }

    // Exchange code for tokens and save to Firestore
    fetch("/api/calendar/google/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, userId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("✅ Calendar connected! Redirecting...");
          sessionStorage.removeItem("connectingUserId");
          setTimeout(() => router.push("/"), 2000);
        } else {
          setStatus(`Error: ${data.error || "Unknown error"}`);
        }
      })
      .catch((err) => {
        setStatus(`Error: ${err.message}`);
      });
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Calendar Connection</h1>
        <p className="text-gray-700">{status}</p>
      </div>
    </div>
  );
}
