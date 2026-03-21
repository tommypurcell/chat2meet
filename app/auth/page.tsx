"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Connecting calendar...");
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Debug: show what we received
    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    setDebugInfo(JSON.stringify(allParams, null, 2));

    if (error) {
      setStatus(`Error from Google: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`);
      return;
    }

    if (!code) {
      setStatus("No authorization code received. Check debug info below.");
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
          // Show detailed error
          const errorDetails = data.details ? `\n\nDetails: ${data.details}` : "";
          setStatus(`Error: ${data.error || "Unknown error"}${errorDetails}`);
          setDebugInfo((prev) =>
            prev + "\n\n--- API Response ---\n" + JSON.stringify(data, null, 2)
          );
        }
      })
      .catch((err) => {
        setStatus(`Network Error: ${err.message}`);
        setDebugInfo((prev) => prev + "\n\n--- Exception ---\n" + err.toString());
      });
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">Calendar Connection</h1>
        <p className="text-gray-700 mb-4">{status}</p>

        {debugInfo && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Debug Info (click to expand)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {debugInfo}
            </pre>
            <p className="mt-2 text-xs text-gray-600">
              Current URL: {typeof window !== "undefined" ? window.location.href : ""}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600">
          Loading…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
