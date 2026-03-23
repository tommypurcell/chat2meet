/**
 * Export all Firestore data to JSON for auditing
 * Run with: npx tsx scripts/export-firestore.ts
 */

import { getDb } from "../lib/firebase-admin";
import { writeFileSync } from "fs";
import { join } from "path";

async function exportFirestore() {
  console.log("Starting Firestore export...");

  const db = getDb();
  const data: Record<string, any> = {
    calendars: [],
    events: [],
    network: [],
    users: [],
  };

  try {
    // Export calendars collection
    console.log("Exporting calendars...");
    const calendarsSnapshot = await db.collection("calendars").get();
    for (const doc of calendarsSnapshot.docs) {
      data.calendars.push({
        id: doc.id,
        ...doc.data(),
      });
    }
    console.log(`  Found ${data.calendars.length} calendars`);

    // Export events collection
    console.log("Exporting events...");
    const eventsSnapshot = await db.collection("events").get();
    for (const doc of eventsSnapshot.docs) {
      data.events.push({
        id: doc.id,
        ...doc.data(),
      });
    }
    console.log(`  Found ${data.events.length} events`);

    // Export network collection
    console.log("Exporting network...");
    const networkSnapshot = await db.collection("network").get();
    for (const doc of networkSnapshot.docs) {
      data.network.push({
        id: doc.id,
        ...doc.data(),
      });
    }
    console.log(`  Found ${data.network.length} network documents`);

    // Export users collection (including subcollections)
    console.log("Exporting users...");
    const usersSnapshot = await db.collection("users").get();
    for (const userDoc of usersSnapshot.docs) {
      const userData: any = {
        id: userDoc.id,
        ...userDoc.data(),
        calendarAccounts: [],
        network: [],
      };

      // Get calendarAccounts subcollection
      const calendarAccountsSnapshot = await userDoc.ref
        .collection("calendarAccounts")
        .get();
      for (const accountDoc of calendarAccountsSnapshot.docs) {
        const accountData = accountDoc.data();
        // Redact sensitive tokens for security
        userData.calendarAccounts.push({
          id: accountDoc.id,
          ...accountData,
          accessToken: accountData.accessToken ? "[REDACTED]" : undefined,
          refreshToken: accountData.refreshToken ? "[REDACTED]" : undefined,
        });
      }

      // Get network subcollection
      const networkSubSnapshot = await userDoc.ref.collection("network").get();
      for (const networkDoc of networkSubSnapshot.docs) {
        userData.network.push({
          id: networkDoc.id,
          ...networkDoc.data(),
        });
      }

      data.users.push(userData);
    }
    console.log(`  Found ${data.users.length} users`);

    // Save to file
    const outputPath = join(process.cwd(), "firebase_data.json");
    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n✓ Export complete! Saved to: ${outputPath}`);
    console.log("\nSummary:");
    console.log(`  - Calendars: ${data.calendars.length}`);
    console.log(`  - Events: ${data.events.length}`);
    console.log(`  - Network: ${data.network.length}`);
    console.log(`  - Users: ${data.users.length}`);

    // Count calendar accounts
    const totalAccounts = data.users.reduce((sum: number, user: any) => sum + (user.calendarAccounts?.length || 0), 0);
    console.log(`  - Calendar Accounts: ${totalAccounts}`);

    // Count user network connections
    const totalConnections = data.users.reduce((sum: number, user: any) => sum + (user.network?.length || 0), 0);
    console.log(`  - User Network Connections: ${totalConnections}`);

  } catch (error) {
    console.error("Error exporting Firestore:", error);
    throw error;
  }
}

exportFirestore()
  .then(() => {
    console.log("\n✓ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
