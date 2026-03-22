"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface CalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
}

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Connecting calendar...");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [step, setStep] = useState<"connecting" | "pick-calendar" | "done" | "error">("connecting");
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const allParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      allParams[key] = value;
    });
    setDebugInfo(JSON.stringify(allParams, null, 2));

    if (error) {
      setStatus(`Error from Google: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`);
      setStep("error");
      return;
    }

    if (!code) {
      setStatus("No authorization code received. Check debug info below.");
      setStep("error");
      return;
    }

    async function resolveUserIdAndConnect(authCode: string) {
      // Try sessionStorage first, then fall back to the server session
      let resolvedUserId = sessionStorage.getItem("connectingUserId");

      if (!resolvedUserId) {
        try {
          const meRes = await fetch("/api/auth/me");
          const meData = await meRes.json();
          resolvedUserId = meData?.user?.uid ?? null;
        } catch {
          // ignore – will show error below
        }
      }

      if (!resolvedUserId) {
        setStatus("No user ID found. Please try connecting again.");
        setStep("error");
        return;
      }

      setUserId(resolvedUserId);

      try {
        const res = await fetch("/api/calendar/google/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: authCode, userId: resolvedUserId }),
        });
        const data = await res.json();

        if (data.success) {
          setStatus("Calendar connected! Now choose which calendar to use.");
          sessionStorage.removeItem("connectingUserId");

          // Fetch available calendars
          try {
            const calRes = await fetch(`/api/calendar/google/calendars?userId=${resolvedUserId}`);
            const calData = await calRes.json();

            if (calData.success && calData.calendars?.length > 0) {
              setCalendars(calData.calendars);
              // Pre-select the primary calendar
              const primary = calData.calendars.find((c: CalendarOption) => c.primary);
              setSelectedCalendar(primary?.id || calData.calendars[0].id);
              setStep("pick-calendar");
            } else {
              // No calendars found or error — just redirect
              setStatus("Calendar connected! Redirecting...");
              setStep("done");
              setTimeout(() => router.push("/"), 2000);
            }
          } catch {
            // If fetching calendars fails, just redirect
            setStatus("Calendar connected! Redirecting...");
            setStep("done");
            setTimeout(() => router.push("/"), 2000);
          }
        } else {
          const errorDetails = data.details ? `\n\nDetails: ${data.details}` : "";
          setStatus(`Error: ${data.error || "Unknown error"}${errorDetails}`);
          setStep("error");
          setDebugInfo((prev) =>
            prev + "\n\n--- API Response ---\n" + JSON.stringify(data, null, 2)
          );
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(`Network Error: ${message}`);
        setStep("error");
        setDebugInfo((prev) => prev + "\n\n--- Exception ---\n" + String(err));
      }
    }

    resolveUserIdAndConnect(code);
  }, [searchParams, router]);

  async function handleSaveCalendar() {
    if (!selectedCalendar || !userId) return;
    setSaving(true);

    try {
      const res = await fetch("/api/calendar/google/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, calendarId: selectedCalendar }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("Calendar selected! Redirecting...");
        setStep("done");
        setTimeout(() => router.push("/"), 1500);
      } else {
        setStatus(`Error saving selection: ${data.error}`);
      }
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg-secondary)]">
      <div className="w-full max-w-md p-8 bg-[var(--bg-primary)] rounded-2xl" style={{ boxShadow: 'var(--shadow-elevated)' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="3" stroke="var(--accent-primary)" strokeWidth="2" />
              <path d="M3 9h18M8 2v4M16 2v4" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {step === "pick-calendar" ? "Choose Your Calendar" : "Calendar Connection"}
          </h1>
          {step === "pick-calendar" && (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Select which Google Calendar to use for scheduling
            </p>
          )}
        </div>

        {/* Calendar Picker */}
        {step === "pick-calendar" && (
          <div className="space-y-4">
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {calendars.map((cal) => (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => setSelectedCalendar(cal.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-all border ${
                    selectedCalendar === cal.id
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 shadow-[0_0_0_1px_var(--accent-primary)]"
                      : "border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--text-tertiary)]"
                  }`}
                >
                  {/* Calendar color dot */}
                  <div
                    className="h-4 w-4 rounded-full shrink-0 ring-2 ring-white/20"
                    style={{ backgroundColor: cal.backgroundColor || "var(--accent-primary)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${
                      selectedCalendar === cal.id ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
                    }`}>
                      {cal.summary}
                    </p>
                    {cal.primary && (
                      <p className="text-[11px] text-[var(--text-tertiary)]">Primary calendar</p>
                    )}
                  </div>
                  {/* Checkmark */}
                  {selectedCalendar === cal.id && (
                    <div className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSaveCalendar}
              disabled={saving || !selectedCalendar}
              className="w-full rounded-xl bg-[var(--accent-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {/* Status messages for non-picker states */}
        {step !== "pick-calendar" && (
          <div className="text-center">
            {step === "connecting" && (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
                <p className="text-sm text-[var(--text-secondary)]">{status}</p>
              </div>
            )}
            {step === "done" && (
              <div className="flex items-center justify-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{status}</p>
              </div>
            )}
            {step === "error" && (
              <>
                <p className="text-sm text-[var(--accent-danger)] mb-4">{status}</p>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-sm font-medium text-[var(--text-link)] hover:underline"
                >
                  Back to app
                </button>
              </>
            )}
          </div>
        )}

        {debugInfo && step === "error" && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              Debug Info (click to expand)
            </summary>
            <pre className="mt-2 p-4 bg-[var(--bg-secondary)] rounded-lg text-xs overflow-auto text-[var(--text-secondary)]">
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
