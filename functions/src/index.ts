import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";

const FORA_PEPPER = defineSecret("FORA_PEPPER");
import cors from "cors";
import { Resend } from "resend";
import { ReceiptEmail } from "./emails/ReceiptTemplate";
import { MarketingEmail } from "./emails/MarketingTemplate";
import { render } from "@react-email/components";

admin.initializeApp();
const db = admin.firestore();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
type FlowerDoc = {
  title: string;
  message: string;
  author?: string | null;
  x: number;
  y: number;
  flower: string;
  slug: string;
  createdAt: FirebaseFirestore.FieldValue;
};

// Limit instances (cost + safety)
setGlobalOptions({ maxInstances: 10 });

export {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentHistory,
  cancelSubscription,
  checkExpiredSubscriptions,
  razorpayWebhook,
} from "./payment-funtion";

/* ============================================================
   CORS CONFIG (FOR BROWSER CALLS)
   ============================================================ */

const corsHandler = cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173", // Vite default
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

/* ============================================================
   AUTH HELPER
   ============================================================ */

export const verifyAuth = async (req: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }

  const token = authHeader.substring(7); // remove "Bearer "

  const decodedToken = await admin.auth().verifyIdToken(token);

  return decodedToken;
};
/* ============================================================
   EXISTING BACKEND LOGIC (UNCHANGED)
   ============================================================ */

function getNextUnlockDate(currentUnlockDate: Date, pattern: "minutely" | "daily" | "weekly" | "monthly" | "yearly" | string): Date {
  const next = new Date(currentUnlockDate);
  const now = new Date();
  
  do {
    if (pattern === "minutely") {
      next.setMinutes(next.getMinutes() + 1);
    } else if (pattern === "daily") {
      next.setDate(next.getDate() + 1);
    } else if (pattern === "weekly") {
      next.setDate(next.getDate() + 7);
    } else if (pattern === "monthly") {
      next.setMonth(next.getMonth() + 1);
    } else if (pattern === "yearly") {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      break;
    }
  } while (next <= now);
  
  return next;
}

function handleCapsuleUnlock(doc: admin.firestore.DocumentSnapshot, batch: admin.firestore.WriteBatch) {
  const data = doc.data();
  if (!data) return;

  batch.update(doc.ref, {
    isUnlocked: true,
    status: "unlocked",
    unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create notifications for each recipient upon unlock
  if (data.recipients && Array.isArray(data.recipients)) {
    data.recipients.forEach((recipientId: string) => {
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, {
        userId: recipientId,
        type: "capsule_unlocked",
        message: `A time capsule has unlocked!`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    });
  } else {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      userId: data.userId,
      type: "capsule_unlocked",
      message: `Your time capsule has unlocked!`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  }

  if (data.recurrencePattern && data.recurrencePattern !== "none" && !data.nextInstanceCreated) {
    batch.update(doc.ref, { nextInstanceCreated: true });

    const currentUnlockDate = data.unlockDate.toDate();
    const nextUnlockDate = getNextUnlockDate(currentUnlockDate, data.recurrencePattern);
    const nextVisibleFrom = new Date(nextUnlockDate);
    nextVisibleFrom.setHours(nextVisibleFrom.getHours() - 1);
    const nextRef = db.collection("capsules").doc();
    batch.set(nextRef, {
      ...data,
      id: nextRef.id,
      unlockDate: admin.firestore.Timestamp.fromDate(nextUnlockDate),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "scheduled",
      isUnlocked: false,
      unlockedAt: null,
      priorReminderSent: false,
      openedBy: [],
      nextUnlockAt: nextUnlockDate.toISOString(),
      visibleFrom: nextVisibleFrom.toISOString(),
      nextInstanceCreated: false,
    });
  }
}

/**
 * Scheduled unlock (every minute)
 */
export const checkAndUnlockCapsules = onSchedule(
  "every 1 minutes",
  async () => {
    const now = admin.firestore.Timestamp.now();

    // 1. Unlocking capsules (both "time" and "event" trigger types)
    const [snapshotTime, snapshotEvent] = await Promise.all([
      db
        .collection("capsules")
        .where("isUnlocked", "==", false)
        .where("status", "==", "scheduled")
        .where("triggerType", "==", "time")
        .where("unlockDate", "<=", now)
        .get(),
      db
        .collection("capsules")
        .where("isUnlocked", "==", false)
        .where("status", "==", "scheduled")
        .where("triggerType", "==", "event")
        .where("unlockDate", "<=", now)
        .get()
    ]);

    const docsToProcess = [...snapshotTime.docs, ...snapshotEvent.docs];

    if (docsToProcess.length > 0) {
      const batch = db.batch();
      docsToProcess.forEach((doc) => {
        handleCapsuleUnlock(doc, batch);
      });
      await batch.commit();
    }

    // 2. Processing Prior Reminders
    const timeReminderSnapshot = await db
      .collection("capsules")
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("priorReminderEnabled", "==", true)
      .where("priorReminderSent", "==", false)
      .get();

    const eventReminderSnapshot = await db
      .collection("capsules")
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "event")
      .where("priorReminderEnabled", "==", true)
      .where("priorReminderSent", "==", false)
      .get();

    let docsForReminder = [...timeReminderSnapshot.docs];
    eventReminderSnapshot.docs.forEach((doc) => {
      if (doc.data().isReminderCapsule) {
        docsForReminder.push(doc);
      }
    });

    if (docsForReminder.length > 0) {
      const reminderBatch = db.batch();
      const nowMs = Date.now();

      for (const doc of docsForReminder) {
        const data = doc.data();
        const unlockDateMs = data.unlockDate.toMillis();
        const reminderDaysMs = data.priorReminderDays * 24 * 60 * 60 * 1000;

        if (unlockDateMs - reminderDaysMs <= nowMs) {
          // Send notification to user
          const notifRef = db.collection("notifications").doc();
          reminderBatch.set(notifRef, {
            userId: data.userId,
            type: "prior_reminder",
            message: `A time capsule is scheduled to unlock in ${data.priorReminderDays} days!`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });

          // Mark reminder as sent
          reminderBatch.update(doc.ref, {
            priorReminderSent: true,
          });
        }
      }
      await reminderBatch.commit();
    }
  }
);

/**
 * Callable manual unlock
 */
export const checkCapsuleUnlockStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login required");
  }

  const now = admin.firestore.Timestamp.now();

  const [snapshotTime, snapshotEvent] = await Promise.all([
    db
      .collection("capsules")
      .where("userId", "==", request.auth.uid)
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("unlockDate", "<=", now)
      .get(),
    db
      .collection("capsules")
      .where("userId", "==", request.auth.uid)
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "event")
      .where("unlockDate", "<=", now)
      .get()
  ]);

  const docsToProcess = [...snapshotTime.docs, ...snapshotEvent.docs];

  if (docsToProcess.length === 0) return { count: 0 };

  const batch = db.batch();
  docsToProcess.forEach((doc) => {
    handleCapsuleUnlock(doc, batch);
  });

  await batch.commit();
  return { count: docsToProcess.length };
});

/**
 * Firestore trigger (optional, may fail first time)
 */
export const scheduleCapsuleUnlock = onDocumentCreated(
  "capsules/{capsuleId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.triggerType !== "time") return;

    await db.collection("scheduledUnlocks").doc(event.params.capsuleId).set({
      capsuleId: event.params.capsuleId,
      unlockDate: data.unlockDate,
      userId: data.userId,
      recipients: data.recipients,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });
  }
);

/**
 * 📣 SEND MARKETING BLAST (Admin Only)
 */
export const sendMarketingBlast = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      // Simple secret-based protection for demo purposes
      if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const { userEmails } = req.body; // Array of emails
      if (!Array.isArray(userEmails)) {
        res.status(400).json({ error: "userEmails must be an array" });
        return;
      }

      const results = [];
      for (const email of userEmails) {
        const html = await render(MarketingEmail({ userName: "Member" }));
        const result = await resend.emails.send({
          from: "Forá <marketing@resend.dev>", // TODO: Replace with verified domain
          to: [email],
          subject: "Reconnect with your future self 🏺",
          html,
        });
        results.push({ email, id: result.data?.id, error: result.error });
      }

      res.json({ success: true, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
});


/* ============================================================
   HTTP APIs (WITH CORS)
   ============================================================ */

/**
 * Get server time for synchronized unlocking
 */
export const getServerTime = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    res.json({
      serverTime: new Date().toISOString(),
      serverTimeMs: Date.now(),
    });
  });
});

/**
 * Create capsule
 */
export const createCapsule = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const subRef = db.collection("subscriptions").doc(user.uid);

      await db.runTransaction(async (tx) => {
        const subSnap = await tx.get(subRef);
        const plan = subSnap.exists ? subSnap.data() : { tier: "free", usedCapsules: 0 };
        if (!plan) throw new Error("No plan assigned");

        const capsuleLimit = plan.capsuleLimit === undefined ? 5 : plan.capsuleLimit; // Default to free limit of 5, null means unlimited
        let usedCapsules = plan.usedCapsules ?? 0;

        // 🔁 Monthly reset (starter)
        if (
          plan.resetInterval === "monthly" &&
          plan.lastResetAt &&
          typeof plan.lastResetAt.toDate === "function"
        ) {
          const now = admin.firestore.Timestamp.now();
          const last = plan.lastResetAt.toDate();

          const isNewMonth =
            now.toDate().getMonth() !== last.getMonth() ||
            now.toDate().getFullYear() !== last.getFullYear();

          if (isNewMonth) {
            usedCapsules = 0;
            tx.set(subRef, {
              usedCapsules: 0,
              lastResetAt: now,
            }, { merge: true });
          }
        }

        // 🚫 ENFORCEMENT (ONLY THIS)
        if (capsuleLimit !== null && usedCapsules >= capsuleLimit) {
          throw new Error("CAPSULE_LIMIT_REACHED");
        }

        // ✅ CREATE CAPSULE (v2 — encrypted fields)
        const ref = db.collection("capsules").doc();
        tx.set(ref, {
          id: ref.id,
          // v2 encrypted fields
          encryptedTitle:   req.body.encryptedTitle,
          titleIV:          req.body.titleIV,
          encryptedContent: req.body.encryptedContent,
          contentIV:        req.body.contentIV,
          encryptedKeys:    req.body.encryptedKeys || {},
          version:          "v2",
          // unencrypted metadata
          triggerType:      req.body.triggerType,
          unlockDate:       req.body.unlockDate ? admin.firestore.Timestamp.fromDate(new Date(req.body.unlockDate)) : null,
          recipientType:    req.body.recipientType,
          recipients:       req.body.recipients,
          attachments:      req.body.attachments || [],
          category:         req.body.category || "",
          signature:        req.body.signature || null,
          userId:           user.uid,
          createdAt:        admin.firestore.FieldValue.serverTimestamp(),
          status:           "scheduled",
          isUnlocked:       false,
          autoRecurYearly:   req.body.triggerType === "event" ? (req.body.autoRecurYearly || false) : false,
          recurrencePattern: req.body.triggerType === "event" ? (req.body.recurrencePattern || "none") : "none",
          priorReminderEnabled: req.body.priorReminderEnabled || false,
          priorReminderDays: req.body.priorReminderDays || 0,
          priorReminderSent: false,
          reminderConfig:   req.body.reminderConfig || null,
          isReminderCapsule: req.body.isReminderCapsule || false,
          nextUnlockAt:     req.body.nextUnlockAt || null,
          visibleFrom:      req.body.visibleFrom || null,
          openedBy:         [],
        });

        // 🔢 Increment usage (single source of truth)
        tx.set(subRef, {
          usedCapsules: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error("createCapsule error:", e.message);

      if (e.message === "CAPSULE_LIMIT_REACHED") {
        res.status(403).json({
          error: "Capsule limit reached. Upgrade your plan.",
          code: "LIMIT_REACHED",
        });
        return;
      }

      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Get my capsules
 */
export const getMyCapsules = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);

      const snap = await db
        .collection("capsules")
        .where("userId", "==", user.uid)
        .orderBy("createdAt", "desc")
        .get();

      const results = snap.docs
        .map((d) => {
          const data = d.data();
          const isOpenedByMe = Array.isArray(data.openedBy) && data.openedBy.includes(user.uid);
          const isReminder = data.isReminderCapsule === true;
          return {
            id: d.id,
            ...data,
            isOpenedByMe,
            isReminder,
          };
        })
        .filter((c) => !(c.isReminder && c.isOpenedByMe));

      res.json(results);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Get received capsules
 */
export const getReceivedCapsules = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);

      const snap = await db
        .collection("capsules")
        .where("recipients", "array-contains", user.uid)
        .get();

      const results = snap.docs
        .map((d) => {
          const data = d.data();
          const isOpenedByMe = Array.isArray(data.openedBy) && data.openedBy.includes(user.uid);
          const isReminder = data.isReminderCapsule === true;
          return {
            id: d.id,
            ...data,
            isOpenedByMe,
            isReminder,
          };
        })
        .filter((c) => !(c.isReminder && c.isOpenedByMe));

      res.json(results);
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Open capsule
 */
export const openCapsule = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { capsuleId } = req.body;

      const ref = db.collection("capsules").doc(capsuleId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const data = snap.data();
      if (data?.userId !== user.uid && !data?.recipients?.includes(user.uid)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const batch = db.batch();
      batch.update(ref, {
        openedBy: admin.firestore.FieldValue.arrayUnion(user.uid),
        isUnlocked: true,
        status: "unlocked",
      });

      if (data?.userId === user.uid && data?.recurrencePattern && data?.recurrencePattern !== "none" && !data?.nextInstanceCreated) {
        batch.update(ref, { nextInstanceCreated: true });

        const currentUnlockDate = data.unlockDate ? data.unlockDate.toDate() : new Date();
        const nextUnlockDate = getNextUnlockDate(currentUnlockDate, data.recurrencePattern);
        const nextVisibleFrom = new Date(nextUnlockDate);
        nextVisibleFrom.setHours(nextVisibleFrom.getHours() - 1);

        const nextRef = db.collection("capsules").doc();
        batch.set(nextRef, {
          ...data,
          id: nextRef.id,
          unlockDate: admin.firestore.Timestamp.fromDate(nextUnlockDate),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "scheduled",
          isUnlocked: false,
          unlockedAt: null,
          priorReminderSent: false,
          openedBy: [],
          nextUnlockAt: nextUnlockDate.toISOString(),
          visibleFrom: nextVisibleFrom.toISOString(),
          nextInstanceCreated: false,
        });
      }

      await batch.commit();
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Delete capsule (Firestore doc + Storage media + scheduledUnlock + decrement usage)
 */
export const deleteCapsule = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { capsuleId } = req.body;

      if (!capsuleId) {
        res.status(400).json({ error: "capsuleId is required" });
        return;
      }

      const ref = db.collection("capsules").doc(capsuleId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const capsuleData = snap.data();
      if (capsuleData?.userId !== user.uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // 1. Delete all media files from Firebase Storage under capsules/{capsuleId}/
      try {
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({
          prefix: `capsules/${capsuleId}/`,
        });
        if (files.length > 0) {
          await Promise.all(files.map((file) => file.delete()));
                  }
      } catch (storageErr) {
        console.error("Storage cleanup error (non-fatal):", storageErr);
        // Continue even if storage cleanup fails
      }

      // 2. Delete the scheduledUnlocks doc if it exists
      try {
        const scheduledRef = db
          .collection("scheduledUnlocks")
          .doc(capsuleId);
        const scheduledSnap = await scheduledRef.get();
        if (scheduledSnap.exists) {
          await scheduledRef.delete();
        }
      } catch (scheduleErr) {
        console.error("ScheduledUnlock cleanup error (non-fatal):", scheduleErr);
      }

      // 3. Delete the Firestore capsule document
      await ref.delete();

      // 4. Decrement the user's capsule usage count
      try {
        const subRef = db.collection("subscriptions").doc(user.uid);
        await subRef.set({
          usedCapsules: admin.firestore.FieldValue.increment(-1),
        }, { merge: true });
      } catch (usageErr) {
        console.error("Usage decrement error (non-fatal):", usageErr);
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("deleteCapsule error:", e.message);
      res.status(401).json({ error: e.message });
    }
  });
});

/**
 * Manual unlock (admin/debug)
 */
export const unlockDueCapsules = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const now = admin.firestore.Timestamp.now();

    const snapshot = await db
      .collection("capsules")
      .where("isUnlocked", "==", false)
      .where("status", "==", "scheduled")
      .where("triggerType", "==", "time")
      .where("unlockDate", "<=", now)
      .limit(100)
      .get();

    if (snapshot.empty) {
      res.json({ unlockedCount: 0 });
      return;
    }

    const batch = db.batch();
    snapshot.forEach((doc) => {
      batch.update(doc.ref, {
        isUnlocked: true,
        status: "unlocked",
        unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    res.json({ unlockedCount: snapshot.size });
  });
});

export const getMyProfile = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const token = authHeader.split("Bearer ")[1];
      const decoded = await admin.auth().verifyIdToken(token);

      const userSnap = await db.collection("users").doc(decoded.uid).get();
      const userData = userSnap.exists ? userSnap.data() : {};

      const subSnap = await db.collection("subscriptions").doc(decoded.uid).get();
      const rawPlan = subSnap.data() || { tier: "free" };
      const rawTier = rawPlan.tier || "free";
      let capsuleLimit: number | null = 5;

      if (rawTier === "starter") {
        capsuleLimit = 50;
      }

      if (rawTier === "pro") {
        capsuleLimit = null; // Unlimited
      }
      if (rawTier === "free") {
        capsuleLimit = 5;
      }

      res.json({
        uid: decoded.uid,
        username: userData?.username || userData?.name || decoded.email,
        plan: {
          tier: rawTier,
          capsuleLimit,
          usedCapsules: rawPlan.usedCapsules ?? 0,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(401).json({ error: "Invalid token" });
    }
  });
});

export const sendFriendRequest = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { receiverId } = req.body;

      if (!receiverId || receiverId === user.uid) {
        res.status(400).json({ error: "Invalid receiver" });
        return;
      }

      const friendshipId = [user.uid, receiverId].sort().join("_");
      const ref = db.collection("friends").doc(friendshipId);

      const existing = await ref.get();
      if (existing.exists) {
        res.status(400).json({ error: "Already requested or friends" });
        return;
      }

      await ref.set({
        requesterId: user.uid,
        receiverId: receiverId,
        participants: [user.uid, receiverId],
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(401).json({ error: e.message });
    }
  });
});

export const getFriends = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const user = await verifyAuth(req);

      const snap = await db
        .collection("friends")
        .where("status", "==", "accepted")
        .where("participants", "array-contains", user.uid)
        .get();

      const friends = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();

          const friendId = data.participants.find(
            (id: string) => id !== user.uid
          );

          if (!friendId) return null;

          const userSnap = await db.collection("users").doc(friendId).get();

          return {
            id: doc.id,
            profile: userSnap.exists
              ? { uid: friendId, ...userSnap.data() }
              : null,
          };
        })
      );

      res.json(friends.filter(Boolean));
    } catch (err: any) {
      console.error("[getFriends ERROR]", err);
      res.status(401).json({ error: err.message });
    }
  });
});

export const acceptFriendRequest = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { friendshipId } = req.body;

      const ref = db.collection("friends").doc(friendshipId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const data = snap.data();
      if (!data?.participants.includes(user.uid)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.update({ status: "accepted" });
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(401).json({ error: "Unauthorized" });
    }
  });
});

export const removeFriend = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { friendshipId } = req.body;

      const ref = db.collection("friends").doc(friendshipId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      const data = snap.data();
      if (!data?.participants.includes(user.uid)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.delete();
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(401).json({ error: "Unauthorized" });
    }
  });
});

export const getPendingRequests = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      const user = await verifyAuth(req);

      const snapshot = await db
        .collection("friends")
        .where("receiverId", "==", user.uid)
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .get();

      const pending = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();

          const senderId = data.requesterId;
          const senderSnap = await db.collection("users").doc(senderId).get();
          const senderData = senderSnap.exists ? senderSnap.data() : {};

          return {
            id: doc.id,
            senderUid: senderId,
            senderName: senderData?.name || "Unknown",
            senderEmail: senderData?.email || "",
            senderPhotoURL: senderData?.photoURL || "",
          };
        })
      );

      res.json(pending);
    } catch (err: any) {
      console.error("getPendingRequests failed:", err);
      res.status(401).json({ error: err.message });
    }
  });
});

export const rejectFriendRequest = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { friendshipId } = req.body;

      const ref = db.collection("friends").doc(friendshipId);
      const snap = await ref.get();

      if (!snap.exists) {
        res.status(404).json({ error: "Not found" });
        return;
      }

      if (snap.data()?.receiverId !== user.uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      await ref.update({ status: "rejected" });
      res.json({ success: true });
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});
export const searchUsers = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const user = await verifyAuth(req);
      const { query } = req.body;

      if (!query) {
        res.json([]);
        return;
      }

      if (query === "SUGGESTIONS_TRIGGER") {
        const snap = await db.collection("users").limit(30).get();
        res.json(
          snap.docs
            .map((d) => d.data())
            .filter((u) => u.uid !== user.uid)
            .sort(() => Math.random() - 0.5) // Shuffle slightly
            .slice(0, 12)
        );
        return;
      }

      const queryLower = query.toLowerCase();
      const queryTitle = query.charAt(0).toUpperCase() + query.slice(1).toLowerCase();

      const promises = [
        db.collection("users").where("email", ">=", queryLower).where("email", "<=", queryLower + "\uf8ff").limit(10).get(),
        db.collection("users").where("username", ">=", queryLower).where("username", "<=", queryLower + "\uf8ff").limit(10).get(),
        db.collection("users").where("username", ">=", query).where("username", "<=", query + "\uf8ff").limit(10).get(),
        db.collection("users").where("name", ">=", query).where("name", "<=", query + "\uf8ff").limit(10).get(),
        db.collection("users").where("name", ">=", queryTitle).where("name", "<=", queryTitle + "\uf8ff").limit(10).get(),
        db.collection("users").where("name", ">=", queryLower).where("name", "<=", queryLower + "\uf8ff").limit(10).get(),
      ];

      const snaps = await Promise.all(promises);
      const resultsMap = new Map();

      snaps.forEach((snap) => {
        snap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.uid !== user.uid) {
            resultsMap.set(data.uid, data);
          }
        });
      });

      res.json(Array.from(resultsMap.values()).slice(0, 20));
    } catch (e: any) {
      res.status(401).json({ error: e.message });
    }
  });
});
export const notifyFriendRequest = onDocumentCreated(
  "friends/{id}",
  async (event) => {
    const data = event.data?.data();
    if (!data || data.status !== "pending") return;

    await db.collection("notifications").add({
      userId: data.receiverId,
      type: "friend_request",
      message: "You have a new friend request",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  }
);
export const getNotifications = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const user = await verifyAuth(req);

    const snap = await db
      .collection("notifications")
      .where("userId", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    res.json(snap.docs.map((d) => d.data()));
  });
});

/**
 * Get garden flowers
 */
export const getFlowers = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const minX = req.query.minX ? Number(req.query.minX) : null;
      const maxX = req.query.maxX ? Number(req.query.maxX) : null;

      let query: FirebaseFirestore.Query = db.collection("flowers");

      if (minX !== null) query = query.where("x", ">=", minX);
      if (maxX !== null) query = query.where("x", "<=", maxX);

      const snap = await query.get();

      res.json(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (err) {
      console.error("[getFlowers ERROR]", err);
      res.status(500).json({ error: "Failed to fetch flowers" });
    }
  });
});
/**
 * Plant a flower (public garden)
 */ export const initUserPlans = onRequest(async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();

    let updated = 0;
    let skipped = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();

      // If plan already exists, skip
      if (data.plan) {
        skipped++;
        continue;
      }

      await doc.ref.update({
        plan: {
          tier: "free",
          capsuleLimit: 5,
          usedCapsules: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      updated++;
    }

    res.json({
      success: true,
      updated,
      skipped,
      total: usersSnap.size,
    });
  } catch (error: any) {
    console.error("❌ initUserPlans failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export const plantFlower = onRequest((req, res) => {
  corsHandler(req, res, async () => {
    try {
      const { title, message, author, x, y, flower } = req.body;

      if (!title || !message || x === undefined || y === undefined || !flower) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const data: FlowerDoc = {
        title,
        slug,
        message,
        author: author || null,
        x: Math.round(x),
        y: Math.round(y),
        flower,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const ref = await db.collection("flowers").add(data);

      res.json({
        id: ref.id,
        ...data,
      });
    } catch (err) {
      console.error("[plantFlower ERROR]", err);
      res.status(500).json({ error: "Failed to plant flower" });
    }
  });
});

/* ============================================================
   ENCRYPTION — KEY MATERIAL
   ============================================================ */

/**
 * Returns uid + server pepper to the authenticated client.
 * Used by the browser to derive the master key via PBKDF2.
 * NEVER log the pepper or the returned keyMaterial.
 */
export const getKeyMaterial = onCall(
  {
    secrets: [FORA_PEPPER],
    enforceAppCheck: false, // set true once App Check is configured
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const uid = request.auth.uid;
    // DO NOT log uid + pepper together — log uid only
    
    return {
      keyMaterial: uid + FORA_PEPPER.value(),
    };
  }
);
