/**
 * Seeds Firestore MVP collections with dummy data.
 *
 * Uses the same credential rules as API routes (`lib/firebase-credential.ts`):
 * GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_FILE, FIREBASE_SERVICE_ACCOUNT_PATH,
 * FIREBASE_SERVICE_ACCOUNT (inline/path/base64), or Application Default Credentials.
 *
 * Run: npm run db:seed
 */

import "./load-env";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "../lib/firebase-admin";

const USERS = {
  tommy: "user_tommy",
  rae: "user_rae",
  janet: "user_janet",
} as const;

const EVENT_ID = "event_demo_pickleball";
const NETWORK_ID = "conn_tommy_rae";

const now = () => Timestamp.now();
const fixed = (iso: string) => Timestamp.fromDate(new Date(iso));

async function seed() {
  const db = getDb();

  const batch = db.batch();

  const usersRef = db.collection("users");
  batch.set(usersRef.doc(USERS.tommy), {
    name: "Tommy",
    email: "tommy@example.com",
    photoUrl: "",
    timezone: "America/Los_Angeles",
    calendarConnected: true,
    ghostMode: false,
    createdAt: fixed("2026-03-01T12:00:00.000Z"),
    updatedAt: now(),
  });
  batch.set(usersRef.doc(USERS.rae), {
    name: "Rae",
    email: "rae@example.com",
    photoUrl: "",
    timezone: "America/Los_Angeles",
    calendarConnected: true,
    ghostMode: false,
    createdAt: fixed("2026-03-02T15:30:00.000Z"),
    updatedAt: now(),
  });
  batch.set(usersRef.doc(USERS.janet), {
    name: "Janet",
    email: "janet@example.com",
    photoUrl: "",
    timezone: "America/New_York",
    calendarConnected: false,
    ghostMode: false,
    createdAt: fixed("2026-03-03T09:00:00.000Z"),
    updatedAt: now(),
  });

  batch.set(db.collection("network").doc(NETWORK_ID), {
    ownerUserId: USERS.tommy,
    memberUserId: USERS.rae,
    memberName: "Rae",
    memberEmail: "rae@example.com",
    memberPhotoUrl: "",
    relationStatus: "accepted",
    createdAt: fixed("2026-03-10T18:00:00.000Z"),
    updatedAt: now(),
  });

  const eventRef = db.collection("events").doc(EVENT_ID);
  batch.set(eventRef, {
    title: "Pickleball this week",
    createdBy: USERS.tommy,
    participantIds: [USERS.tommy, USERS.rae, USERS.janet],
    dateRangeStart: "2026-03-21",
    dateRangeEnd: "2026-03-28",
    durationMinutes: 90,
    timezone: "America/Los_Angeles",
    status: "active",
    bestSlot: {
      start: "2026-03-28T10:00:00-07:00",
      end: "2026-03-28T11:30:00-07:00",
      availableCount: 3,
      score: 0.92,
    },
    finalizedSlot: null,
    createdAt: fixed("2026-03-15T20:00:00.000Z"),
    updatedAt: now(),
  });

  const pCol = eventRef.collection("participants");
  batch.set(pCol.doc(USERS.tommy), {
    userId: USERS.tommy,
    name: "Tommy",
    email: "tommy@example.com",
    photoUrl: "",
    role: "organizer",
    ghostMode: false,
    calendarConnected: true,
    joinedAt: fixed("2026-03-15T20:00:00.000Z"),
    updatedAt: now(),
  });
  batch.set(pCol.doc(USERS.rae), {
    userId: USERS.rae,
    name: "Rae",
    email: "rae@example.com",
    photoUrl: "",
    role: "member",
    ghostMode: false,
    calendarConnected: true,
    joinedAt: fixed("2026-03-15T20:05:00.000Z"),
    updatedAt: now(),
  });
  batch.set(pCol.doc(USERS.janet), {
    userId: USERS.janet,
    name: "Janet",
    email: "janet@example.com",
    photoUrl: "",
    role: "member",
    ghostMode: false,
    calendarConnected: false,
    joinedAt: fixed("2026-03-16T14:00:00.000Z"),
    updatedAt: now(),
  });

  const aCol = eventRef.collection("availability");
  batch.set(aCol.doc(USERS.rae), {
    userId: USERS.rae,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-24T13:00:00-07:00",
        end: "2026-03-24T15:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-24T17:00:00-07:00",
        end: "2026-03-24T21:00:00-07:00",
        quality: "high",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T08:00:00.000Z"),
    updatedAt: now(),
  });
  batch.set(aCol.doc(USERS.tommy), {
    userId: USERS.tommy,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-25T09:00:00-07:00",
        end: "2026-03-25T12:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-25T14:00:00-07:00",
        end: "2026-03-25T20:00:00-07:00",
        quality: "medium",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T08:15:00.000Z"),
    updatedAt: now(),
  });

  await batch.commit();

  console.log("Seeded Firestore MVP data:");
  console.log(`  users/${USERS.tommy}, users/${USERS.rae}, users/${USERS.janet}`);
  console.log(`  network/${NETWORK_ID}`);
  console.log(`  events/${EVENT_ID}`);
  console.log(
    `  events/${EVENT_ID}/participants/{${USERS.tommy},${USERS.rae},${USERS.janet}}`,
  );
  console.log(
    `  events/${EVENT_ID}/availability/{${USERS.tommy},${USERS.rae}}`,
  );
}

seed().catch((err) => {
  console.error(err);
  console.error(
    "\nCredentials: set FIREBASE_SERVICE_ACCOUNT_FILE=./key.json or GOOGLE_APPLICATION_CREDENTIALS, " +
      "or run: gcloud auth application-default login",
  );
  process.exit(1);
});
