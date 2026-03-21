"use client";

import { GoogleCalendarConnect } from "@/components/calendar/GoogleCalendarConnect";
import { GoogleCalendarDisconnect } from "@/components/calendar/GoogleCalendarDisconnect";
import { CalendarEventsList } from "@/components/calendar/CalendarEventsList";

export default function TestCalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Connection Section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold mb-2">Test Calendar Integration</h1>
          <p className="text-gray-600 mb-6">
            Click the button below to connect your Google Calendar.
          </p>

          <div className="space-y-3">
            <GoogleCalendarConnect userId="user_tommy" />
            <GoogleCalendarDisconnect userId="user_tommy" />
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded text-sm">
            <p className="font-semibold text-blue-900 mb-2">What happens:</p>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>Saves userId to sessionStorage</li>
              <li>Redirects to Google OAuth</li>
              <li>You grant permissions</li>
              <li>Google redirects back to /auth</li>
              <li>Code exchanges for tokens</li>
              <li>Tokens saved to Firestore</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded text-xs">
            <p className="font-semibold text-gray-700 mb-1">After connecting:</p>
            <p className="text-gray-600">
              Check Firestore Console → users/user_tommy/calendarAccounts
            </p>
          </div>
        </div>

        {/* Events List Section */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Your Calendar Events
          </h2>
          <CalendarEventsList userId="user_tommy" />
        </div>
      </div>
    </div>
  );
}
