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
          setStatus("Calendar connected! Redirecting...");
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
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-secondary)]">
      <div className="text-center p-8 bg-[var(--bg-primary)] rounded-lg max-w-2xl" style={{ boxShadow: 'var(--shadow-elevated)' }}>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-4">Calendar Connection</h1>
        <p className="text-[var(--text-secondary)] mb-4">{status}</p>

        {debugInfo && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              Debug Info (click to expand)
            </summary>
            <pre className="mt-2 p-4 bg-[var(--bg-secondary)] rounded text-xs overflow-auto text-[var(--text-secondary)]">
              {debugInfo}
            </pre>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">
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
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
          Loading…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
