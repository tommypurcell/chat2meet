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
  pete: "user_pete",
  phil: "user_phil",
  sarah: "user_sarah",
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
  batch.set(usersRef.doc(USERS.pete), {
    name: "Pete",
    email: "pete@example.com",
    photoUrl: "",
    timezone: "America/Los_Angeles",
    calendarConnected: true,
    ghostMode: false,
    createdAt: fixed("2026-03-04T10:00:00.000Z"),
    updatedAt: now(),
  });
  batch.set(usersRef.doc(USERS.phil), {
    name: "Phil",
    email: "phil@example.com",
    photoUrl: "",
    timezone: "America/Los_Angeles",
    calendarConnected: true,
    ghostMode: false,
    createdAt: fixed("2026-03-05T11:00:00.000Z"),
    updatedAt: now(),
  });
  batch.set(usersRef.doc(USERS.sarah), {
    name: "Sarah",
    email: "sarah@example.com",
    photoUrl: "",
    timezone: "America/Los_Angeles",
    calendarConnected: true,
    ghostMode: false,
    createdAt: fixed("2026-03-06T09:30:00.000Z"),
    updatedAt: now(),
  });

  // Create parent network documents
  batch.set(db.collection("network").doc(USERS.tommy), { createdAt: now() });
  batch.set(db.collection("network").doc(USERS.rae), { createdAt: now() });

  // Tommy's network
  batch.set(
    db
      .collection("network")
      .doc(USERS.tommy)
      .collection("friends")
      .doc(USERS.rae),
    {
      status: "accepted",
      createdAt: fixed("2026-03-10T18:00:00.000Z"),
      updatedAt: now(),
    }
  );

  // Rae's network connections
  batch.set(
    db
      .collection("network")
      .doc(USERS.rae)
      .collection("friends")
      .doc(USERS.pete),
    {
      status: "accepted",
      createdAt: fixed("2026-03-11T10:00:00.000Z"),
      updatedAt: now(),
    }
  );
  batch.set(
    db
      .collection("network")
      .doc(USERS.rae)
      .collection("friends")
      .doc(USERS.janet),
    {
      status: "accepted",
      createdAt: fixed("2026-03-11T11:00:00.000Z"),
      updatedAt: now(),
    }
  );
  batch.set(
    db
      .collection("network")
      .doc(USERS.rae)
      .collection("friends")
      .doc(USERS.phil),
    {
      status: "accepted",
      createdAt: fixed("2026-03-11T12:00:00.000Z"),
      updatedAt: now(),
    }
  );
  batch.set(
    db
      .collection("network")
      .doc(USERS.rae)
      .collection("friends")
      .doc(USERS.sarah),
    {
      status: "accepted",
      createdAt: fixed("2026-03-12T09:00:00.000Z"),
      updatedAt: now(),
    }
  );

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
  // All times in PST (-07:00) for easy overlap detection
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
  batch.set(aCol.doc(USERS.pete), {
    userId: USERS.pete,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-24T11:00:00-07:00",
        end: "2026-03-24T13:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-24T17:00:00-07:00",
        end: "2026-03-24T20:00:00-07:00",
        quality: "high",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T08:00:00.000Z"),
    updatedAt: now(),
  });
  batch.set(aCol.doc(USERS.phil), {
    userId: USERS.phil,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-24T15:00:00-07:00",
        end: "2026-03-24T16:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-24T17:00:00-07:00",
        end: "2026-03-24T21:00:00-07:00",
        quality: "high",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T07:45:00.000Z"),
    updatedAt: now(),
  });
  batch.set(aCol.doc(USERS.janet), {
    userId: USERS.janet,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-24T11:00:00-07:00",
        end: "2026-03-24T12:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-24T17:00:00-07:00",
        end: "2026-03-24T20:00:00-07:00",
        quality: "high",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T08:30:00.000Z"),
    updatedAt: now(),
  });
  batch.set(aCol.doc(USERS.sarah), {
    userId: USERS.sarah,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-24T09:00:00-07:00",
        end: "2026-03-24T10:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-24T18:00:00-07:00",
        end: "2026-03-24T21:00:00-07:00",
        quality: "high",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T08:10:00.000Z"),
    updatedAt: now(),
  });
  batch.set(aCol.doc(USERS.tommy), {
    userId: USERS.tommy,
    source: "google_calendar",
    busyBlocks: [
      {
        start: "2026-03-24T09:00:00-07:00",
        end: "2026-03-24T12:00:00-07:00",
      },
    ],
    freeWindows: [
      {
        start: "2026-03-24T17:00:00-07:00",
        end: "2026-03-24T21:00:00-07:00",
        quality: "high",
      },
    ],
    lastSyncedAt: fixed("2026-03-20T08:15:00.000Z"),
    updatedAt: now(),
  });

  await batch.commit();

  console.log("Seeded Firestore MVP data:");
  console.log(`  Users: ${Object.values(USERS).join(", ")}`);
  console.log(`  Network: network/{userId}/friends/{friendId}`);
  console.log(`    - ${USERS.tommy}/friends/${USERS.rae}`);
  console.log(`    - ${USERS.rae}/friends/{${USERS.pete},${USERS.janet},${USERS.phil},${USERS.sarah}}`);
  console.log(`  Events: ${EVENT_ID}`);
  console.log(
    `  Availability for: ${[USERS.rae, USERS.tommy, USERS.janet, USERS.pete, USERS.phil, USERS.sarah].join(", ")}`,
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
