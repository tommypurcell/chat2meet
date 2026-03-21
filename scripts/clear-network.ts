/**
 * Clear old network structure before reseeding
 * Run: npx tsx scripts/clear-network.ts
 */

import "./load-env";
import { getDb } from "../lib/firebase-admin";

async function clear() {
  const db = getDb();

  console.log("Clearing old network documents...");

  const networkSnapshot = await db.collection("network").get();

  for (const doc of networkSnapshot.docs) {
    console.log(`  Deleting network/${doc.id}`);
    await doc.ref.delete();
  }

  console.log("✅ Old network structure cleared!\n");
}

clear().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
