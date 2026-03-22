/**
 * Verify the seeded data structure
 * Run: npx tsx scripts/verify-schema.ts
 */

import "./load-env";
import { getDb } from "../lib/firebase-admin";

async function verify() {
  const db = getDb();

  console.log("\n═══════════════════════════════════════");
  console.log("FIRESTORE SCHEMA VERIFICATION");
  console.log("═══════════════════════════════════════\n");

  // 1. List all users
  console.log("📋 USERS:");
  const usersSnapshot = await db.collection("users").get();
  const users = new Map<string, any>();
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    users.set(doc.id, data);
    console.log(`  • ${doc.id}: ${data.name} (${data.email})`);
  });

  // 2. Check network structure
  console.log("\n🤝 NETWORK STRUCTURE:");
  const networkSnapshot = await db.collection("network").get();

  if (networkSnapshot.empty) {
    console.log("  ⚠️  No network documents found!");
  } else {
    for (const userDoc of networkSnapshot.docs) {
      const userId = userDoc.id;
      const userData = users.get(userId);
      const userName = userData?.name || "Unknown";

      console.log(`\n  ${userName} (${userId}):`);

      const friendsSnapshot = await userDoc.ref
        .collection("friends")
        .get();

      if (friendsSnapshot.empty) {
        console.log(`    └─ No friends`);
      } else {
        let friendIndex = 0;
        friendsSnapshot.forEach((friendDoc) => {
          const friendId = friendDoc.id;
          const friendData = friendDoc.data();
          const friendName = users.get(friendId)?.name || "Unknown";
          const isLast = friendIndex === friendsSnapshot.size - 1;
          friendIndex++;
          const prefix = isLast ? "└─" : "├─";
          console.log(
            `    ${prefix} ${friendName} (${friendId}) [${friendData.status}]`
          );
        });
      }
    }
  }

  // 3. Verify document structure
  console.log("\n📄 SAMPLE DOCUMENT STRUCTURE:");
  const sampleNetworkDoc = networkSnapshot.docs[0];
  if (sampleNetworkDoc) {
    const sampleFriendDoc = await sampleNetworkDoc.ref
      .collection("friends")
      .limit(1)
      .get();

    if (!sampleFriendDoc.empty) {
      console.log("  Network connection document fields:");
      const fields = sampleFriendDoc.docs[0].data();
      Object.keys(fields).forEach((key) => {
        console.log(`    • ${key}: ${JSON.stringify(fields[key])}`);
      });
    }
  }

  console.log("\n✅ Verification complete!\n");
}

verify().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
