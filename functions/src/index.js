import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();
const db = admin.firestore();

// Global options for cost control
setGlobalOptions({ maxInstances: 10 });

/**
 * Method 1: Scheduled function (runs every minute)
 */
export const checkAndUnlockCapsules = onSchedule(
  "every 1 minutes",
  async () => {
    const now = admin.firestore.Timestamp.now();

    try {
      const capsulesSnapshot = await db
        .collection("capsules")
        .where("isUnlocked", "==", false)
        .where("status", "==", "scheduled")
        .where("triggerType", "==", "time")
        .where("unlockDate", "<=", now)
        .get();

      if (capsulesSnapshot.empty) {
        console.log("No capsules to unlock");
        return;
      }

      const batch = db.batch();
      const notifications: any[] = [];

      capsulesSnapshot.forEach((doc) => {
        const capsuleRef = db.collection("capsules").doc(doc.id);
        batch.update(capsuleRef, {
          isUnlocked: true,
          status: "unlocked",
          unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const capsuleData = doc.data();
        capsuleData.recipients.forEach((recipient: string) => {
          notifications.push({
            recipientEmail: recipient,
            capsuleId: doc.id,
            capsuleTitle: capsuleData.title,
            senderUsername: capsuleData.username,
            unlockedAt: new Date(),
          });
        });
      });

      await batch.commit();
      console.log(`Unlocked ${capsulesSnapshot.size} capsules`);

      await sendUnlockNotifications(notifications);

      return { unlockedCount: capsulesSnapshot.size };
    } catch (error) {
      console.error("Error unlocking capsules:", error);
      throw error;
    }
  }
);

/**
 * Method 2: Callable function to check unlock status manually
 */
export const checkCapsuleUnlockStatus = onCall(async (request) => {
  const context = request.context;

  if (!context.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated to check capsule status"
    );
  }

  const userId = context.auth.uid;
  const now = admin.firestore.Timestamp.now();

  try {
    const capsulesSnapshot = await db
      .collection("capsules")
      .where("userId", "==", userId)
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("unlockDate", "<=", now)
      .get();

    if (capsulesSnapshot.empty) {
      return { message: "No capsules ready to unlock", count: 0 };
    }

    const batch = db.batch();
    capsulesSnapshot.forEach((doc) => {
      const capsuleRef = db.collection("capsules").doc(doc.id);
      batch.update(capsuleRef, {
        isUnlocked: true,
        status: "unlocked",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    return {
      message: `${capsulesSnapshot.size} capsules unlocked`,
      count: capsulesSnapshot.size,
    };
  } catch (error: any) {
    console.error("Error checking unlock status:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Method 3: Firestore trigger on capsule creation
 */
export const scheduleCapsuleUnlock = onDocumentCreated(
  "capsules/{capsuleId}",
  async (event) => {
    const capsuleData = event.data?.data();
    const capsuleId = event.params.capsuleId;

    if (!capsuleData || capsuleData.triggerType !== "time") {
      return;
    }

    try {
      await db.collection("scheduledUnlocks").doc(capsuleId).set({
        capsuleId,
        unlockDate: capsuleData.unlockDate,
        userId: capsuleData.userId,
        recipients: capsuleData.recipients,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processed: false,
      });

      console.log(
        `Scheduled unlock for capsule ${capsuleId} at ${capsuleData.unlockDate.toDate()}`
      );
      return { success: true };
    } catch (error) {
      console.error("Error scheduling capsule unlock:", error);
      throw error;
    }
  }
);

/**
 * Method 4: On-demand HTTP function
 */
export const unlockDueCapsules = onRequest(async (req, res) => {
  const now = admin.firestore.Timestamp.now();

  try {
    const capsulesSnapshot = await db
      .collection("capsules")
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("unlockDate", "<=", now)
      .limit(100)
      .get();

    if (capsulesSnapshot.empty) {
      return res.json({ success: true, unlockedCount: 0 });
    }

    const batch = db.batch();
    capsulesSnapshot.forEach((doc) => {
      const capsuleRef = db.collection("capsules").doc(doc.id);
      batch.update(capsuleRef, {
        isUnlocked: true,
        status: "unlocked",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    res.json({
      success: true,
      unlockedCount: capsulesSnapshot.size,
    });
  } catch (error: any) {
    console.error("Error unlocking capsules:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Send notifications
 */
async function sendUnlockNotifications(notifications: any[]) {
  const batch = db.batch();

  notifications.forEach((notification) => {
    const notificationRef = db.collection("notifications").doc();
    batch.set(notificationRef, {
      ...notification,
      type: "capsule_unlocked",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`Created ${notifications.length} notifications`);

  // TODO: Integrate with SendGrid, Nodemailer, etc.
}
