/**
 * Check availability data in events
 * Run: npx tsx scripts/check-availability.ts
 */

import "./load-env";
import { getDb } from "../lib/firebase-admin";

async function check() {
  const db = getDb();

  console.log("\n═══════════════════════════════════════");
  console.log("AVAILABILITY DATA CHECK");
  console.log("═══════════════════════════════════════\n");

  // List all events
  const eventsSnapshot = await db.collection("events").get();
  console.log(`📋 Events (${eventsSnapshot.size}):`);
  eventsSnapshot.forEach((doc) => {
    console.log(`  • ${doc.id}`);
  });

  // Check availability for demo event
  const eventId = "event_demo_pickleball";
  console.log(`\n📅 Availability for "${eventId}":`);

  const availSnapshot = await db
    .collection("events")
    .doc(eventId)
    .collection("availability")
    .get();

  if (availSnapshot.empty) {
    console.log(`  ⚠️  No availability data found!`);
  } else {
    availSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\n  ${doc.id}:`);
      console.log(`    Free windows: ${data.freeWindows?.length || 0}`);
      data.freeWindows?.forEach((fw: any, i: number) => {
        console.log(`      ${i + 1}. ${fw.start} - ${fw.end} [${fw.quality}]`);
      });
    });
  }

  console.log("\n✅ Check complete!\n");
}

check().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
