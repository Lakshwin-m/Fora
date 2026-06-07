// scripts/wipeOldData.js
// Run once: node scripts/wipeOldData.js
// Requires: serviceAccountKey.json in the same directory

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function wipeAll() {
  console.log("⚠️  Starting data wipe...");

  // ── 1. Wipe all capsule documents ──
  const capsules = await db.collection("capsules").get();
  if (!capsules.empty) {
    // Firestore batch limit = 500
    const chunks = [];
    for (let i = 0; i < capsules.docs.length; i += 500) {
      chunks.push(capsules.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
    console.log(`✅ Deleted ${capsules.size} capsules`);
  } else {
    console.log("ℹ️  No capsules to delete");
  }

  // ── 2. Strip encryption key fields from user docs (keep profile data) ──
  const users = await db.collection("users").get();
  if (!users.empty) {
    const chunks = [];
    for (let i = 0; i < users.docs.length; i += 500) {
      chunks.push(users.docs.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach((d) => {
        batch.update(d.ref, {
          encryptedPrivateKey: admin.firestore.FieldValue.delete(),
          privateKeyIV: admin.firestore.FieldValue.delete(),
          salt: admin.firestore.FieldValue.delete(),
          publicKey: admin.firestore.FieldValue.delete(),
          keysGeneratedAt: admin.firestore.FieldValue.delete(),
        });
      });
      await batch.commit();
    }
    console.log(`✅ Cleaned key fields from ${users.size} user docs`);
  } else {
    console.log("ℹ️  No user docs found");
  }

  console.log("");
  console.log("🗂  Next: wipe Firebase Storage manually.");
  console.log("   Firebase Console → Storage → Delete all files under capsules/");
  console.log("   OR: firebase storage:delete --recursive gs://YOUR_BUCKET/capsules/");
  console.log("");
  console.log("✅ Data wipe complete.");
  process.exit(0);
}

wipeAll().catch((err) => {
  console.error("❌ Wipe failed:", err);
  process.exit(1);
});
